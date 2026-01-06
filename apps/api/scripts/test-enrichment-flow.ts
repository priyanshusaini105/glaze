/**
 * Test Enrichment Flow with Faker Data
 * 
 * This script:
 * 1. Creates a test table with columns
 * 2. Adds rows with fake data (only name is filled)
 * 3. Triggers enrichment for email and company columns
 */

import { faker } from '@faker-js/faker';

const API_BASE = 'http://localhost:3001';

async function testEnrichmentFlow() {
    console.log('🧪 Starting Enrichment Flow Test with Faker Data\n');
    console.log('='.repeat(60));

    // Step 1: Create a test table with columns
    console.log('\n📋 Step 1: Creating test table...');

    const tableResponse = await fetch(`${API_BASE}/tables`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: 'Enrichment Test - ' + new Date().toISOString().slice(0, 19),
            description: 'Test table for enrichment workflow'
        })
    });

    const table = await tableResponse.json();
    console.log(`   ✅ Created table: ${table.name} (${table.id})`);

    // Step 2: Add columns
    console.log('\n📊 Step 2: Adding columns...');

    const columnsResponse = await fetch(`${API_BASE}/tables/${table.id}/columns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([
            { key: 'name', label: 'Full Name', dataType: 'text' },
            { key: 'email', label: 'Email Address', dataType: 'text' },
            { key: 'company', label: 'Company', dataType: 'text' }
        ])
    });

    const columns = await columnsResponse.json();
    console.log(`   ✅ Created ${columns.length} columns: name, email, company`);

    // Get column IDs
    const nameColumn = columns.find((c: any) => c.key === 'name');
    const emailColumn = columns.find((c: any) => c.key === 'email');
    const companyColumn = columns.find((c: any) => c.key === 'company');

    // Step 3: Add rows with fake data (only name filled)
    console.log('\n👤 Step 3: Adding rows with faker data (name only)...');

    const rowIds: string[] = [];

    for (let i = 0; i < 3; i++) {
        const fakeName = faker.person.fullName();

        const rowResponse = await fetch(`${API_BASE}/tables/${table.id}/rows`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                data: {
                    name: fakeName,
                    email: '',  // Empty - to be enriched
                    company: '' // Empty - to be enriched
                }
            })
        });

        const row = await rowResponse.json();
        rowIds.push(row.id);
        console.log(`   ✅ Row ${i + 1}: ${fakeName} (${row.id})`);
    }

    // Step 4: Trigger enrichment for email and company columns
    console.log('\n🔄 Step 4: Triggering enrichment for email & company columns...');

    const enrichResponse = await fetch(`${API_BASE}/tables/${table.id}/enrich`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            columnIds: [emailColumn.id, companyColumn.id],
            rowIds: rowIds
        })
    });

    const enrichResult = await enrichResponse.json();

    if (enrichResponse.status === 201 || enrichResponse.status === 200) {
        console.log(`   ✅ Enrichment job created!`);
        console.log(`   📊 Job ID: ${enrichResult.jobId}`);
        console.log(`   📊 Total tasks: ${enrichResult.totalTasks}`);
        console.log(`   📊 Status: ${enrichResult.status}`);
    } else {
        console.log(`   ❌ Enrichment failed:`, enrichResult);
    }

    // Step 5: Poll for job completion
    console.log('\n⏳ Step 5: Polling for job completion...');

    let jobComplete = false;
    let attempts = 0;
    const maxAttempts = 30;

    while (!jobComplete && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        attempts++;

        const jobResponse = await fetch(
            `${API_BASE}/tables/${table.id}/enrich/jobs/${enrichResult.jobId}`
        );
        const jobStatus = await jobResponse.json();

        console.log(`   🔄 Attempt ${attempts}: Status=${jobStatus.status}, Progress=${jobStatus.progress}%`);

        if (jobStatus.status === 'completed' || jobStatus.status === 'failed') {
            jobComplete = true;
            console.log(`\n   ${jobStatus.status === 'completed' ? '✅' : '❌'} Job ${jobStatus.status}!`);
            console.log(`   📊 Done: ${jobStatus.doneTasks}, Failed: ${jobStatus.failedTasks}`);
        }
    }

    // Step 6: Check the enriched data
    console.log('\n📝 Step 6: Checking enriched data...');

    const rowsResponse = await fetch(`${API_BASE}/tables/${table.id}/rows`);
    const rowsData = await rowsResponse.json();

    console.log('\n   Enriched Rows:');
    for (const row of rowsData.rows) {
        console.log(`   ─────────────────────────────────────`);
        console.log(`   Name:    ${row.data.name}`);
        console.log(`   Email:   ${row.data.email || '(not enriched)'}`);
        console.log(`   Company: ${row.data.company || '(not enriched)'}`);
        console.log(`   Status:  ${row.status}`);
        console.log(`   Confidence: ${row.confidence || 'N/A'}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Enrichment Flow Test Complete!');
    console.log(`\n📋 Table ID: ${table.id}`);
    console.log(`📋 Job ID: ${enrichResult.jobId}`);
    console.log('\nView in UI: http://localhost:3000/tables/' + table.id);
    console.log('='.repeat(60));

    return {
        tableId: table.id,
        jobId: enrichResult.jobId,
        rowIds
    };
}

// Run the test
testEnrichmentFlow().catch(console.error);
