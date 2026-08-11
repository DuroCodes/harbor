import SwiftUI

struct SettingsView: View {
    @Environment(AppLockService.self) private var appLock
    @Environment(SyncService.self) private var syncService
    @Environment(\.dismiss) private var dismiss

    @State private var proxyURL = KeychainStore.string(for: .proxyBaseURL) ?? ""
    @State private var proxyAPIKey = KeychainStore.string(for: .proxyAPIKey) ?? ""
    @State private var savedMessage: String?
    @State private var showSetPasscode = false
    @State private var showDisableConfirm = false

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("Proxy URL", text: $proxyURL)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .keyboardType(.URL)
                        .foregroundStyle(.white)
                    SecureField("API key", text: $proxyAPIKey)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .foregroundStyle(.white)
                    Button("Save") {
                        saveProxySettings()
                    }
                    .foregroundStyle(HarborBrand.accent)
                    if let savedMessage {
                        Text(savedMessage)
                            .font(.footnote)
                            .foregroundStyle(HarborSurface.labelMuted)
                    }
                } header: {
                    Text("Plaid Proxy")
                }
                .listRowBackground(HarborSurface.elevated)

                Section {
                    if appLock.hasPasscode {
                        Toggle("Unlock with \(appLock.biometricsName)", isOn: Binding(
                            get: { appLock.biometricsEnabled },
                            set: { appLock.biometricsEnabled = $0 }
                        ))
                        .tint(HarborBrand.accent)
                        .disabled(!appLock.biometricsAvailable)

                        Button("Change Passcode") {
                            showSetPasscode = true
                        }
                        .foregroundStyle(HarborBrand.accent)

                        Button("Turn Off App Lock", role: .destructive) {
                            showDisableConfirm = true
                        }
                    } else {
                        Button("Set Passcode…") {
                            showSetPasscode = true
                        }
                        .foregroundStyle(HarborBrand.accent)
                    }
                } header: {
                    Text("Security")
                } footer: {
                    Text(appLock.hasPasscode
                         ? "Harbor locks on launch. Use your passcode anytime — \(appLock.biometricsName) is optional."
                         : "Add a 4–6 digit Harbor passcode to lock the app. You can also enable \(appLock.biometricsName) for faster unlocks.")
                }
                .listRowBackground(HarborSurface.elevated)

                Section {
                    Button {
                        Task { await syncService.refreshAll() }
                    } label: {
                        if syncService.isSyncing {
                            ProgressView()
                                .tint(HarborBrand.accent)
                                .frame(maxWidth: .infinity, alignment: .leading)
                        } else {
                            Text("Refresh Now")
                                .foregroundStyle(HarborBrand.accent)
                        }
                    }
                    if let error = syncService.lastError {
                        Text(error)
                            .font(.footnote)
                            .foregroundStyle(.red.opacity(0.9))
                    }
                } header: {
                    Text("Refresh Accounts")
                }
                .listRowBackground(HarborSurface.elevated)
            }
            .scrollContentBackground(.hidden)
            .background(HarborSurface.canvas)
            .listSectionSpacing(20)
            .harborInlineTitle("Settings")
            .harborScreen()
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                        .fontWeight(.semibold)
                        .tint(HarborBrand.accent)
                }
            }
            .sheet(isPresented: $showSetPasscode) {
                SetPasscodeSheet(appLock: appLock)
                    .presentationDetents([.medium])
            }
            .confirmationDialog("Turn off app lock?", isPresented: $showDisableConfirm, titleVisibility: .visible) {
                Button("Turn Off", role: .destructive) {
                    appLock.clearPasscode()
                }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text("Your Harbor passcode will be removed.")
            }
        }
    }

    private func saveProxySettings() {
        do {
            let trimmedURL = proxyURL.trimmingCharacters(in: .whitespacesAndNewlines)
            let trimmedKey = proxyAPIKey.trimmingCharacters(in: .whitespacesAndNewlines)
            if trimmedURL.isEmpty {
                KeychainStore.delete(.proxyBaseURL)
            } else {
                try KeychainStore.set(trimmedURL, for: .proxyBaseURL)
            }
            if trimmedKey.isEmpty {
                KeychainStore.delete(.proxyAPIKey)
            } else {
                try KeychainStore.set(trimmedKey, for: .proxyAPIKey)
            }
            savedMessage = "Saved."
        } catch {
            savedMessage = "Could not save."
        }
    }
}

private struct SetPasscodeSheet: View {
    @Bindable var appLock: AppLockService
    @Environment(\.dismiss) private var dismiss

    @State private var step: Step = .enter
    @State private var firstEntry = ""
    @State private var secondEntry = ""
    @State private var errorMessage: String?

    private enum Step {
        case enter
        case confirm
    }

    var body: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: 20) {
                Text(step == .enter ? "Choose a 4–6 digit passcode" : "Confirm passcode")
                    .font(.subheadline)
                    .foregroundStyle(HarborSurface.labelMuted)

                SecureField("••••", text: step == .enter ? $firstEntry : $secondEntry)
                    .keyboardType(.numberPad)
                    .font(HarborTypography.amount(.title))
                    .multilineTextAlignment(.center)
                    .padding(14)
                    .background(HarborSurface.elevated2, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                    .foregroundStyle(.white)
                    .onChange(of: firstEntry) { _, value in
                        firstEntry = String(value.filter(\.isNumber).prefix(6))
                    }
                    .onChange(of: secondEntry) { _, value in
                        secondEntry = String(value.filter(\.isNumber).prefix(6))
                    }

                if let errorMessage {
                    Text(errorMessage)
                        .font(.footnote)
                        .foregroundStyle(HarborBrand.expensePalette[0])
                }

                Spacer()
            }
            .padding(20)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            .background(HarborSurface.canvas)
            .navigationTitle(appLock.hasPasscode ? "Change Passcode" : "Set Passcode")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                        .tint(HarborBrand.accent)
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(step == .enter ? "Next" : "Save") {
                        advance()
                    }
                    .fontWeight(.semibold)
                    .tint(HarborBrand.accent)
                    .disabled(currentDigits.count < 4)
                }
            }
            .toolbarBackground(HarborSurface.canvas, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
        }
    }

    private var currentDigits: String {
        step == .enter ? firstEntry : secondEntry
    }

    private func advance() {
        errorMessage = nil
        if step == .enter {
            guard AppLockService.isValidPasscode(firstEntry) else {
                errorMessage = "Use 4–6 digits."
                return
            }
            step = .confirm
            return
        }

        guard secondEntry == firstEntry else {
            errorMessage = "Passcodes didn’t match."
            secondEntry = ""
            return
        }

        do {
            try appLock.setPasscode(firstEntry)
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
