#!/usr/bin/env node

/**
 * Integration test for Neurolink TTS compatibility
 */

import { VoiceTestService } from './dist/src/index.js';
import dotenv from 'dotenv';

dotenv.config();

async function testIntegration() {
  console.log('\n🧪 Testing Neurolink Integration...\n');

  try {
    // Test 1: Initialize service
    console.log('✓ Test 1: Initialize VoiceTestService');
    const service = VoiceTestService.create();
    console.log('  ✅ Service initialized successfully\n');

    // Test 2: Generate speech
    console.log('✓ Test 2: Generate speech with TTS');
    const audioPath = await service.generateSpeech({
      text: 'This is a test of neurolink TTS integration.',
      languageCode: 'en-US',
      voiceName: 'en-US-Neural2-D',
      audioEncoding: 'MP3',
      play: false,
    });
    console.log(`  ✅ Audio generated: ${audioPath}\n`);

    // Test 3: Generate with background
    console.log('✓ Test 3: Generate speech with background mixing');
    const mixedPath = await service.generateSpeech({
      text: 'Testing background audio mixing with neurolink.',
      languageCode: 'en-US',
      voiceName: 'en-US-Neural2-D',
      audioEncoding: 'WAV',
      backgroundSound: 'office',
      backgroundVolume: 0.2,
      play: false,
    });
    console.log(`  ✅ Mixed audio generated: ${mixedPath}\n`);

    // Test 4: Get voices
    console.log('✓ Test 4: Get available voices');
    const voices = await service.getAvailableVoices('en-US');
    console.log(`  ✅ Found ${voices.length} voices for en-US\n`);

    // Test 5: Get system info
    console.log('✓ Test 5: Get system information');
    const info = service.getSystemInfo();
    console.log(`  ✅ TTS Provider: ${info.ttsProvider}`);
    console.log(`  ✅ STT Provider: ${info.sttProvider}`);
    console.log(`  ✅ Version: ${info.voiceTestVersion}\n`);

    console.log('🎉 All integration tests passed!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Integration test failed:', error.message);
    process.exit(1);
  }
}

testIntegration();
