import assert from "node:assert/strict";
import {test} from "node:test";
import {env} from "@/lib/env";
import {publicSiteUrl} from "@/lib/public-url";
import {getYandexAuthConfig,isYandexAuthConfigured} from "@/lib/yandex-auth-config";

test("Yandex availability requires the flag, both credentials and the exact public callback",()=>{
  const before={id:env.YANDEX_CLIENT_ID,secret:env.YANDEX_CLIENT_SECRET,uri:env.YANDEX_REDIRECT_URI,enabled:env.YANDEX_AUTH_ENABLED};
  try {
    Object.assign(env,{YANDEX_CLIENT_ID:"synthetic-client-id",YANDEX_CLIENT_SECRET:"synthetic-client-secret",YANDEX_REDIRECT_URI:publicSiteUrl("/api/auth/yandex/callback"),YANDEX_AUTH_ENABLED:true});
    assert.equal(isYandexAuthConfigured(),true);
    assert.equal(getYandexAuthConfig().redirectUri,publicSiteUrl("/api/auth/yandex/callback"));
    for(const patch of [{YANDEX_AUTH_ENABLED:false},{YANDEX_CLIENT_ID:""},{YANDEX_CLIENT_SECRET:""},{YANDEX_REDIRECT_URI:"https://0.0.0.0:3000/api/auth/yandex/callback"}]){
      const valid={...env};Object.assign(env,patch);assert.equal(isYandexAuthConfigured(),false);assert.throws(getYandexAuthConfig);Object.assign(env,valid);
    }
  } finally {Object.assign(env,{YANDEX_CLIENT_ID:before.id,YANDEX_CLIENT_SECRET:before.secret,YANDEX_REDIRECT_URI:before.uri,YANDEX_AUTH_ENABLED:before.enabled});}
});
