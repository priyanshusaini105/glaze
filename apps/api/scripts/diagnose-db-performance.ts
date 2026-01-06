#!/usr/bin/env bun
/**
 * Database Performance Diagnostic Script
 * 
 * Tests database connection speed and query performance to diagnose
 * the 6-8 second row creation issue.
 */

import pg from 'pg';

const connectionString = process.env.DATABASE_URL!;

if (!connectionString) {
    console.error('❌ DATABASE_URL environment variable not set');
    process.exit(1);
}

async function diagnose() {
    console.log('🔍 Diagnosing database performance...\n');
    console.log(`📍 Database: ${connectionString.replace(/:[^:@]*@/, ':****@')}\n`);

    // Test 1: Raw connection speed
    console.log('Test 1: PostgreSQL connection establishment');
    const start1 = performance.now();
    const pool = new pg.Pool({
        connectionString,
        max: 1,
        connectionTimeoutMillis: 5000
    });

    try {
        const client = await pool.connect();
        const end1 = performance.now();

        if (end1 - start1 > 500) {
            console.log(`⚠️  Connection time: ${(end1 - start1).toFixed(2)} ms (SLOW - should be < 100ms)`);
        } else {
            console.log(`✓ Connection time: ${(end1 - start1).toFixed(2)} ms`);
        }

        // Test 2: Simple query
        console.log('\nTest 2: Simple SELECT 1 query');
        const start2 = performance.now();
        await client.query('SELECT 1');
        const end2 = performance.now();
        console.log(`✓ Query time: ${(end2 - start2).toFixed(2)} ms`);

        // Test 3: Table lookup
        console.log('\nTest 3: Table lookup by ID');
        const tableIdResult = await client.query(`
      SELECT id FROM tables LIMIT 1
    `);

        if (tableIdResult.rows.length === 0) {
            console.log('⚠️  No tables found in database');
            client.release();
            await pool.end();
            return;
        }

        const testTableId = tableIdResult.rows[0].id;
        console.log(`  Using table ID: ${testTableId}`);

        const start3 = performance.now();
        const result = await client.query(`
      SELECT * FROM tables 
      WHERE id = $1
      LIMIT 1
    `, [testTableId]);
        const end3 = performance.now();

        if (end3 - start3 > 50) {
            console.log(`⚠️  Table lookup time: ${(end3 - start3).toFixed(2)} ms (SLOW)`);
        } else {
            console.log(`✓ Table lookup time: ${(end3 - start3).toFixed(2)} ms`);
        } console.log(`  Found: ${result.rows.length} rows`);

        // Test 4: Row insertion
        console.log('\nTest 4: Row insertion');
        const start4 = performance.now();
        const insertResult = await client.query(`
      INSERT INTO rows (id, "tableId", data, status)
      VALUES (gen_random_uuid(), $1, '{}'::jsonb, 'idle')
      RETURNING id
    `, [testTableId]);
        const end4 = performance.now();

        if (end4 - start4 > 100) {
            console.log(`⚠️  Insert time: ${(end4 - start4).toFixed(2)} ms (SLOW - should be < 50ms)`);
        } else {
            console.log(`✓ Insert time: ${(end4 - start4).toFixed(2)} ms`);
        }
        console.log(`  Row ID: ${insertResult.rows[0].id}`);

        // Clean up test row
        await client.query(`DELETE FROM rows WHERE id = $1`, [insertResult.rows[0].id]);

        // Test 5: Check indexes
        console.log('\nTest 5: Checking indexes on rows table');
        const indexes = await client.query(`
      SELECT 
        indexname,
        indexdef
      FROM pg_indexes
      WHERE tablename = 'rows'
        AND schemaname = 'public'
      ORDER BY indexname
    `);
        console.log(`✓ Found ${indexes.rows.length} indexes:`);

        const expectedIndexes = ['rows_pkey', 'rows_status_idx', 'rows_tableId_createdAt_idx', 'rows_tableId_idx'];
        const foundIndexNames = indexes.rows.map((idx: any) => idx.indexname);

        indexes.rows.forEach((idx: any) => {
            console.log(`  ✓ ${idx.indexname}`);
        });

        const missingIndexes = expectedIndexes.filter(idx => !foundIndexNames.includes(idx));
        if (missingIndexes.length > 0) {
            console.log(`\n⚠️  WARNING: Missing indexes: ${missingIndexes.join(', ')}`);
            console.log(`   Run: cd apps/api && npx prisma migrate dev`);
        }

        // Test 6: Check table stats
        console.log('\nTest 6: Table statistics');
        const stats = await client.query(`
      SELECT 
        n_live_tup,
        n_dead_tup,
        last_vacuum,
        last_autovacuum
      FROM pg_stat_user_tables
      WHERE tablename = 'rows'
    `);

        if (stats.rows.length > 0) {
            const stat = stats.rows[0];
            console.log(`✓ Live rows: ${stat.n_live_tup}`);
            console.log(`  Dead rows: ${stat.n_dead_tup}`);
            console.log(`  Last vacuum: ${stat.last_vacuum || 'never'}`);
            console.log(`  Last autovacuum: ${stat.last_autovacuum || 'never'}`);

            if (stat.n_dead_tup > stat.n_live_tup * 0.2) {
                console.log(`\n⚠️  WARNING: High dead tuple count (${stat.n_dead_tup} dead vs ${stat.n_live_tup} live)`);
                console.log(`   Consider running: VACUUM ANALYZE rows;`);
            }
        }

        // Test 7: Check active connections
        console.log('\nTest 7: Active database connections');
        const connections = await client.query(`
      SELECT count(*), state 
      FROM pg_stat_activity 
      WHERE datname = current_database()
      GROUP BY state
    `);

        console.log('  Connection states:');
        connections.rows.forEach((conn: any) => {
            console.log(`    ${conn.state || 'null'}: ${conn.count}`);
        });

        // Test 8: Check for long-running queries
        console.log('\nTest 8: Long-running queries');
        const longQueries = await client.query(`
      SELECT 
        pid,
        now() - query_start AS duration,
        state,
        LEFT(query, 50) as query_preview
      FROM pg_stat_activity 
      WHERE state = 'active' 
        AND query_start < now() - interval '5 seconds'
        AND datname = current_database()
      ORDER BY duration DESC
      LIMIT 5
    `);

        if (longQueries.rows.length > 0) {
            console.log(`⚠️  Found ${longQueries.rows.length} long-running queries:`);
            longQueries.rows.forEach((q: any) => {
                console.log(`    PID ${q.pid}: ${q.duration} - ${q.query_preview}...`);
            });
        } else {
            console.log(`✓ No long-running queries`);
        }

        client.release();
        await pool.end();

        console.log('\n✅ Diagnosis complete!');
        console.log('\n📊 Summary:');
        console.log('   If row insertion took > 100ms, there may be an issue.');
        console.log('   Check for missing indexes, high dead tuples, or slow connection.');

    } catch (error) {
        console.error('\n❌ Error during diagnosis:', error);
        await pool.end();
        process.exit(1);
    }
}

diagnose().catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
});
