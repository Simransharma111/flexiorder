package com.flexiorder.app;

import android.content.MutableContextWrapper;
import android.os.CancellationSignal;
import androidx.core.content.ContextCompat;
import androidx.credentials.*;
import androidx.credentials.exceptions.*;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.Collections;

/** Delegates password storage and account selection to the user's credential provider. */
@CapacitorPlugin(name = "SavedLogin")
public class SavedLoginPlugin extends Plugin {
    private CancellationSignal active;

    private void result(PluginCall call, String status) {
        active = null;
        JSObject value = new JSObject();
        value.put("status", status);
        call.resolve(value);
    }

    @PluginMethod
    public void save(PluginCall call) {
        String email = call.getString("email", "");
        String password = call.getString("password", "");
        if (email.isEmpty() || password.isEmpty()) { result(call, "unavailable"); return; }
        getActivity().runOnUiThread(() -> {
            if (active != null) { call.reject("Password manager is already open.", "BUSY"); return; }
            active = new CancellationSignal();
            try {
                CredentialManager.create(getContext()).createCredentialAsync(
                    new MutableContextWrapper(getActivity()), new CreatePasswordRequest(email, password), active,
                    ContextCompat.getMainExecutor(getContext()),
                    new CredentialManagerCallback<CreateCredentialResponse, CreateCredentialException>() {
                        @Override public void onResult(CreateCredentialResponse response) { result(call, "saved"); }
                        @Override public void onError(CreateCredentialException error) {
                            result(call, error instanceof CreateCredentialCancellationException ? "cancelled" : "unavailable");
                        }
                    });
            } catch (Exception ignored) { result(call, "unavailable"); }
        });
    }

    @PluginMethod
    public void choose(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (active != null) { call.reject("Password manager is already open.", "BUSY"); return; }
            active = new CancellationSignal();
            GetCredentialRequest request = new GetCredentialRequest.Builder()
                .addCredentialOption(new GetPasswordOption(Collections.emptySet(), false, Collections.emptySet()))
                .build();
            try {
                CredentialManager.create(getContext()).getCredentialAsync(
                    new MutableContextWrapper(getActivity()), request, active,
                    ContextCompat.getMainExecutor(getContext()),
                    new CredentialManagerCallback<GetCredentialResponse, GetCredentialException>() {
                        @Override public void onResult(GetCredentialResponse response) {
                            if (!(response.getCredential() instanceof PasswordCredential)) { result(call, "unavailable"); return; }
                            PasswordCredential credential = (PasswordCredential) response.getCredential();
                            active = null;
                            JSObject value = new JSObject();
                            value.put("status", "selected");
                            value.put("email", credential.getId());
                            value.put("password", credential.getPassword());
                            call.resolve(value);
                        }
                        @Override public void onError(GetCredentialException error) {
                            result(call, error instanceof GetCredentialCancellationException ? "cancelled" :
                                error instanceof NoCredentialException ? "empty" : "unavailable");
                        }
                    });
            } catch (Exception ignored) { result(call, "unavailable"); }
        });
    }

    @PluginMethod
    public void clearSelection(PluginCall call) {
        try {
        CredentialManager.create(getContext()).clearCredentialStateAsync(new ClearCredentialStateRequest(), null,
            ContextCompat.getMainExecutor(getContext()), new CredentialManagerCallback<Void, ClearCredentialException>() {
                @Override public void onResult(Void response) { call.resolve(); }
                @Override public void onError(ClearCredentialException error) { call.resolve(); }
            });
        } catch (Exception ignored) { call.resolve(); }
    }

    @Override protected void handleOnDestroy() {
        if (active != null) { active.cancel(); active = null; }
    }
}
