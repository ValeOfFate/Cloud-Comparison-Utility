// Shared card-rendering functions used by all provider scripts.

const CARD_LABELS = ['Compute', 'Storage', 'Database', 'Networking', 'Machine Learning', 'Serverless', 'Containers', 'Security'];

function buildOfferCard(label, data, loading = false, errMsg = null) {
    const card = document.createElement('div');
    card.className = 'offer-card';

    if (loading) {
        card.innerHTML = `
            <div class="card-label">${label}</div>
            <div class="card-loading">Loading pricing data…</div>`;
        return card;
    }

    if (errMsg) {
        card.innerHTML = `
            <div class="card-label">${label}</div>
            <div class="card-error">Could not load pricing</div>
            <div class="card-note">${errMsg}</div>`;
        return card;
    }

    const rows = data.priceItems
        .map(item => `
            <div class="price-row">
                <span class="price-lbl">${item.label}</span>
                <span class="price-val">${item.value}</span>
            </div>`)
        .join('');

    card.innerHTML = `
        <div class="card-label">${label}</div>
        <div class="card-service">${data.service}</div>
        <div class="price-list">${rows}</div>
        <div class="card-note">${data.note}</div>
        <a class="card-link" href="${data.pricingUrl}" target="_blank">Full Pricing ↗</a>`;

    return card;
}

// Renderer for fully-static providers (Alibaba, GCP, OCI).
// Shows loading placeholders, fetches the JSON, then renders all cards.
async function renderStaticCards(grid, jsonFile) {
    grid.innerHTML = '';
    for (const label of CARD_LABELS) {
        grid.appendChild(buildOfferCard(label, null, true));
    }
    try {
        const resp = await fetch(jsonFile);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        grid.innerHTML = '';
        for (const card of data.cards) {
            grid.appendChild(buildOfferCard(card.label, card));
        }
    } catch (err) {
        grid.innerHTML = '';
        for (const label of CARD_LABELS) {
            grid.appendChild(buildOfferCard(label, null, false, err.message));
        }
    }
}
