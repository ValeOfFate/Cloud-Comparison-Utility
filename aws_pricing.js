// AWS Price List Bulk API — fully public
const AWS_PRICING_BASE = 'https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws';
const AWS_REGION = 'us-east-1';
const AWS_REGION_LABEL = 'us-east-1';

const AWS_CARD_DEFS = [
    { id: 'compute',    label: 'Compute',         staticKey: 'compute',    apiLoader: null     },
    { id: 'storage',    label: 'Storage',          staticKey: 'storage',    apiLoader: null     },
    { id: 'database',   label: 'Database',         staticKey: 'database',   apiLoader: null     },
    { id: 'networking', label: 'Networking',        staticKey: 'networking', apiLoader: null     },
    { id: 'ml',         label: 'Machine Learning',  staticKey: 'ml',         apiLoader: null     },
    { id: 'serverless', label: 'Serverless',        staticKey: null,         apiLoader: 'lambda' },
    { id: 'containers', label: 'Containers',        staticKey: null,         apiLoader: 'eks'    },
    { id: 'security',   label: 'Security',          staticKey: 'security',   apiLoader: null     },
];

// ---------------------------------------------------------------------------
// Live AWS Pricing API fetchers
// ---------------------------------------------------------------------------
const AWS_API_LOADERS = {
    async lambda() {
        const url = `${AWS_PRICING_BASE}/AWSLambda/current/${AWS_REGION}/index.json`;
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();

        const onDemand = data.terms?.OnDemand ?? {};
        const products = data.products ?? {};
        const priceItems = [];
        const seen = new Set();

        for (const [sku, product] of Object.entries(products)) {
            const grp = (product.attributes?.group ?? '').toLowerCase();

            // Skip unlisted versions
            if (grp.includes('arm') || grp.includes('edge') || grp.includes('provisioned')) continue;

            const termEntry = Object.values(onDemand[sku] ?? {})[0];
            if (!termEntry) continue;
            const dim = Object.values(termEntry.priceDimensions ?? {})[0];
            if (!dim) continue;

            const usd = parseFloat(dim.pricePerUnit?.USD ?? '0');
            if (usd === 0) continue;

            if (grp.includes('request') && !seen.has('req')) {
                seen.add('req');
                priceItems.push({ label: 'Per 1M requests', value: `$${(usd * 1_000_000).toFixed(2)}` });
            } else if (grp.includes('duration') && !seen.has('dur')) {
                seen.add('dur');
                priceItems.push({ label: 'Per GB-second', value: `$${usd.toFixed(8)}` });
            }

            if (priceItems.length >= 2) break;
        }

        if (priceItems.length === 0) throw new Error('No pricing data found in response');

        return {
            service: 'AWS Lambda',
            priceItems,
            pricingUrl: 'https://aws.amazon.com/lambda/pricing/',
            note: `${AWS_REGION_LABEL} | Live: AWS Pricing API`,
        };
    },

    async eks() {
        const url = `${AWS_PRICING_BASE}/AmazonEKS/current/${AWS_REGION}/index.json`;
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();

        const onDemand = data.terms?.OnDemand ?? {};
        const products = data.products ?? {};
        const priceItems = [];

        for (const [sku] of Object.entries(products)) {
            const termEntry = Object.values(onDemand[sku] ?? {})[0];
            if (!termEntry) continue;
            const dim = Object.values(termEntry.priceDimensions ?? {})[0];
            if (!dim) continue;
            const usd = parseFloat(dim.pricePerUnit?.USD ?? '0');
            if (usd > 0) {
                priceItems.push({ label: 'EKS Cluster', value: `$${usd.toFixed(3)}/hr` });
                break;
            }
        }

        // Implement some static values
        priceItems.push({ label: 'Fargate vCPU',   value: '$0.04048/vCPU-hr' });
        priceItems.push({ label: 'Fargate Memory',  value: '$0.004445/GB-hr'  });

        return {
            service: 'Amazon EKS / Fargate',
            priceItems,
            pricingUrl: 'https://aws.amazon.com/eks/pricing/',
            note: `${AWS_REGION_LABEL} | Live: AWS Pricing API`,
        };
    },
};

async function renderAWSCards(grid) {
    grid.innerHTML = '';
    const elems = {};

    for (const def of AWS_CARD_DEFS) {
        const elem = buildOfferCard(def.label, null, true);
        elems[def.id] = elem;
        grid.appendChild(elem);
    }

    const staticFetch = fetch('./data/aws_pricing.json')
        .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
        .catch(() => null);

    await Promise.all([
        staticFetch.then(staticPricing => {
            for (const def of AWS_CARD_DEFS.filter(d => d.staticKey)) {
                const data = staticPricing?.[def.staticKey] ?? null;
                const newElem = data
                    ? buildOfferCard(def.label, data)
                    : buildOfferCard(def.label, null, false, 'Failed to load pricing data');
                elems[def.id].replaceWith(newElem);
                elems[def.id] = newElem;
            }
        }),
        ...AWS_CARD_DEFS.filter(def => def.apiLoader).map(async def => {
            const loader = AWS_API_LOADERS[def.apiLoader];
            try {
                const data = await loader();
                const newElem = buildOfferCard(def.label, data);
                elems[def.id].replaceWith(newElem);
                elems[def.id] = newElem;
            } catch (err) {
                const newElem = buildOfferCard(def.label, null, false, err.message);
                elems[def.id].replaceWith(newElem);
                elems[def.id] = newElem;
            }
        }),
    ]);
}
