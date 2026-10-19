import assert from "node:assert/strict";
import {test} from "node:test";
import {landingDestination} from "@/lib/landing-input";
test("Telegram keeps public, invite and bot start links and rejects lookalike hosts",()=>{
 assert.equal(landingDestination("@example_channel","telegram"),"https://t.me/example_channel");
 assert.equal(landingDestination("https://t.me/+invite_test","telegram"),"https://t.me/+invite_test");
 assert.equal(landingDestination("t.me/example_bot?start=campaign","telegram"),"https://t.me/example_bot?start=campaign");
 for(const raw of ["javascript:alert(1)","https://t.me.evil.test/test","https://t.me@evil.test/test","https://user:pass@t.me/test","https://t.me/","http://t.me/name"])assert.equal(landingDestination(raw,"telegram"),null);
});
test("WhatsApp creates an international wa.me link and encodes the unsent message",()=>{
 assert.equal(landingDestination("+7 (900) 123-45-67","whatsapp","Привет & вопрос?"),"https://wa.me/79001234567?text="+encodeURIComponent("Привет & вопрос?"));
 for(const raw of ["","00000","https://wa.me/79001234567","7900abc1234567","1234567890123456"])assert.equal(landingDestination(raw,"whatsapp"),null);
});
test("generic links still reject executable schemes",()=>{
 assert.equal(landingDestination("example.com/path"),"https://example.com/path");
 assert.equal(landingDestination("javascript:alert(1)"),null);
});
