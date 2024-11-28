import * as axios from 'axios';
import * as fs from 'fs';
import CarriersData from './carriers';
const cms_key = 'lecLbqKI4ksoXqvfbvympHk4D1vdm6sw';
const export_object = [];
const carriers_priority_data = CarriersData.carriers_with_priority;
startScript();

async function startScript() {
    for (let index = 0; index < CarriersData.us_states.length; index++) {
        const currentState = CarriersData.us_states[index];
        console.log(`-------WORKING FOR ${currentState}---------`);
        const priorityResults = carriers_priority_data.filter((e) => e.state == currentState);
        if (priorityResults.length > 0) {
            for (let j = 0; j < priorityResults.length; j++) {
                const priorityState = priorityResults[j];
                const object = {
                    cms_carrier_ids: [],
                    tld_carrier_id: priorityState.tld_carrier_id,
                    carrier_name: priorityState.carrier_name,
                    state: currentState,
                    priority: priorityState.priority,
                    cms_carrier_names: [],
                };

                for (let k = 0; k < 300; k = k + 25) {
                    console.log(`LOOPING:${k} for ${priorityState.carrier_name}`)
                    let config = {
                        method: 'get',
                        maxBodyLength: Infinity,
                        url: `https://marketplace.api.healthcare.gov/api/v1/issuers`,
                        params: {
                            apikey: "lecLbqKI4ksoXqvfbvympHk4D1vdm6sw",
                            offset: k,
                            limit: 25,
                            state: currentState,
                            year: 2024,
                        },
                        headers: {
                            'content-type': 'application/json',
                            'content-length': 'Infinity',
                        }
                    };
                    let response = await axios.default.request(config);
                    if (response.data.issuers) {
                        const selectedIssuers = response.data.issuers.filter((e) => areStringsWholeWordMatch(priorityState.carrier_name, e.name));
                        selectedIssuers.map((e) => object['cms_carrier_ids'].push(e.id))
                        selectedIssuers.map((e) => object['cms_carrier_names'].push(e.name))
                    }
                    else {
                        console.log('BROKE AT ', k)
                        break;
                    }
                }
                export_object.push(object);
            }
        }
        else {
            continue;
        }
    }
    /// Cleanup
    for (let index = 0; index < export_object.length; index++) {
        const element = export_object[index];
        if (export_object[index].cms_carrier_names.length == 0) {
            export_object.splice(index, 1);
        }

    }
    fs.writeFile('export.json', JSON.stringify(export_object), 'utf8', (err) => {
        if (err) {
            console.error("An error occurred while writing JSON to file:", err);
        } else {
            console.log("JSON file has been saved successfully!");
        }
    });
}

function areStringsWholeWordMatch(str1: string, str2: string, threshold: number = 0.6): boolean {
    /// This is the condition for matching the Blue cross Blue Shield Carrier
    /// It will accept BlueCross BlueShield & Blue Cross Blue Shield both

    if (str1.toLowerCase().includes('blue') && str1.toLowerCase().includes('cross')) {
        console.log('BLUE CROSS BLUE SHIELD DETECTED with matcher: ', str2);
        if (str2.toLowerCase().includes('blue') && str2.toLowerCase().includes('cross')) {
            console.log('RETURNING TRUE AS IT CONTAINS BLUE CROSS');
            return true;
        }
        return false;
    }

    /// #SpecialCase: This is the condition for neglecting the Christus Health Plan at LA
    if (str1.toLowerCase() === 'christus health plan' && str2.toLowerCase() === 'vantage health plan') {
        console.log('VANTAGE HEALTH PLAN DETECTED')
        return false;
    }

    const normalize = (str: string) =>
        str.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/);

    const words1 = normalize(str1);
    const words2 = normalize(str2);

    // Check if all words of the shorter string are present in the longer string
    const [shorter, longer] = words1.length <= words2.length ? [words1, words2] : [words2, words1];
    const allWordsMatch = shorter.every(word => longer.includes(word));

    if (allWordsMatch) {
        return true;
    }

    // Calculate similarity ratio for general cases
    const matches = words1.filter(word => words2.includes(word)).length;
    const totalWords = Math.max(words1.length, words2.length);
    const similarityRatio = matches / totalWords;

    return similarityRatio >= threshold;
}