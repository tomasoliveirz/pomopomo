
import { RoomCode } from '../src/core/domain/value-objects/RoomCode';

function assert(condition: boolean, message: string) {
    if (!condition) {
        console.error(`❌ Failed: ${message}`);
        process.exit(1);
    } else {
        console.log(`✅ Passed: ${message}`);
    }
}

function runTests() {
    console.log('🧪 Starting RoomCode Verification...\n');

    // Test 1: Generation
    const code1 = RoomCode.generate();
    const code2 = RoomCode.generate();
    assert(code1.toString().length === 4, 'Generated code should be 4 chars');
    assert(code1.toString() !== code2.toString(), 'Generated codes should be random (probabilistic)');
    assert(/^[0-9A-HJKMNP-TV-Z]{4}$/.test(code1.toString()), 'Generated code should match Crockford alphabet');

    // Test 2: Normalization
    assert(RoomCode.normalize('pomo-K34J') === 'K34J', 'Should strip pomo- prefix');
    assert(RoomCode.normalize('k34j') === 'K34J', 'Should uppercase');
    assert(RoomCode.normalize('  K34J  ') === 'K34J', 'Should trim');
    assert(RoomCode.normalize('pomo-k34j') === 'K34J', 'Should handle prefix + lowercase');

    // Test 3: Validation (Lenient for legacy)
    try {
        RoomCode.normalize('ABC1');
        console.log('✅ Passed: Valid alphanumeric code accepted');
    } catch (e) {
        console.error('❌ Failed: Valid alphanumeric code rejected');
    }

    try {
        RoomCode.normalize('AB$1');
        console.error('❌ Failed: Invalid char should be rejected');
    } catch (e) {
        console.log('✅ Passed: Invalid char rejected');
    }

    console.log('\n🏁 RoomCode Tests Completed');
}

runTests();
