// Constant Declarations
const CSP_LIST = ['aws', 'azure', 'gcp', 'oci', 'alibaba', 'ibm', 'salesforce', 'tencent', 'huawei', 'cisco', 'redhat'];
const YAML_URL = 'https://raw.githubusercontent.com/ValeOfFate/Cloud-Comparison-Utility/main/data/cloud_services.yaml';

// Fetch the YAML content GitHub
async function loadData() {
    const response = await fetch(YAML_URL);
    const yamlText = await response.text();
    return jsyaml.load(yamlText);
}

// Build the table to inject
async function buildTable() {
    // Data setup
    const data = await loadData();
    const tbody = document.getElementById('cloud-tbody');
    tbody.innerHTML = '';

    const services = data['Cloud Service'];

    for (const [category, providers] of Object.entries(services)) {
        // Section divider row
        if (providers && providers._section) {
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = CSP_LIST.length + 1;
            td.className = 'section-divider';
            td.textContent = providers._section;
            tr.appendChild(td);
            tbody.appendChild(tr);
            continue;
        }

        // Generate table
        const tr = document.createElement('tr');

        const th = document.createElement('th');
        th.textContent = category;
        tr.appendChild(th);

        for (const cspKey of CSP_LIST) {
            const td = document.createElement('td');
            const service = providers[cspKey];

            if (service && service.services) {
                // Multi-service entry: render each as its own line
                const realServices = service.services.filter(s => s.name);
                realServices.forEach((s, i) => {
                    if (s.link) {
                        const a = document.createElement('a');
                        a.href = s.link;
                        a.textContent = s.name;
                        a.target = '_blank';
                        td.appendChild(a);
                    } else {
                        td.appendChild(document.createTextNode(s.name));
                    }
                    if (i < realServices.length - 1) {
                        td.appendChild(document.createElement('br'));
                    }
                });
            } else if (service && service.name) {
                // Single-service entry
                if (service.link) {
                    const a = document.createElement('a');
                    a.href = service.link;
                    a.textContent = service.name;
                    a.target = '_blank';
                    td.appendChild(a);
                } else {
                    td.textContent = service.name;
                }
            }

            tr.appendChild(td);
        }

        tbody.appendChild(tr);
    }
}

// Add listener to run on load - no need to run this file more than once
document.addEventListener('DOMContentLoaded', buildTable);
