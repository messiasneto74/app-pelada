package com.pelada.app;

import android.os.Bundle;
import android.webkit.WebSettings;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (BuildConfig.DEBUG) {
            // Build debug apenas: a página roda em https://localhost (androidScheme),
            // mas a API/Keycloak de dev local são HTTP — sem isso o WebView bloqueia
            // essas chamadas como "mixed content" mesmo com o cleartext já liberado
            // no network_security_config (aquele libera no nível do SO; este é o
            // bloqueio do próprio WebView). Nunca entra em build de release.
            bridge.getWebView().getSettings().setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        }
    }
}
