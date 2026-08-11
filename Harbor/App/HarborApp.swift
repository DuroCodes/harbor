import SwiftUI
import SwiftData

@main
struct HarborApp: App {
    private let container: ModelContainer
    @State private var appLock = AppLockService()

    init() {
        HarborChrome.applyAppearance()
        do {
            container = try ModelContainer.harbor()
            let context = ModelContext(container)
            try CategorySeeder.seedDefaults(into: context)
            try DemoDataPurger.removeIfPresent(into: context)
        } catch {
            fatalError("Failed to create ModelContainer: \(error)")
        }
    }

    var body: some Scene {
        WindowGroup {
            Group {
                if appLock.isEnabled && !appLock.isUnlocked {
                    AppLockView(appLock: appLock)
                } else {
                    RootTabView()
                }
            }
            .environment(appLock)
            .preferredColorScheme(.dark)
            .tint(HarborBrand.accent)
            .task {
                if appLock.isEnabled {
                    await appLock.unlock()
                }
            }
        }
        .modelContainer(container)
    }
}

struct AppLockView: View {
    @Bindable var appLock: AppLockService
    @State private var passcode = ""
    @State private var errorMessage: String?
    @State private var showPasscodeEntry = false

    var body: some View {
        VStack(spacing: 24) {
            Spacer()
            Image(systemName: "lock")
                .font(.system(size: 40, weight: .light))
                .foregroundStyle(HarborSurface.labelMuted)
            Text(HarborBrand.name)
                .font(.largeTitle.weight(.medium))
                .foregroundStyle(.white)
            Text("Unlock to view your finances")
                .foregroundStyle(HarborSurface.labelMuted)

            if showPasscodeEntry || !appLock.biometricsEnabled || !appLock.biometricsAvailable {
                passcodeField
            } else {
                VStack(spacing: 12) {
                    Button("Unlock with \(appLock.biometricsName)") {
                        Task {
                            let ok = await appLock.unlockWithBiometrics()
                            if !ok {
                                showPasscodeEntry = true
                                errorMessage = "Try your Harbor passcode."
                            }
                        }
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(HarborBrand.accent)
                    .controlSize(.large)

                    Button("Use Passcode") {
                        showPasscodeEntry = true
                    }
                    .foregroundStyle(HarborBrand.accent)
                }
            }

            if let errorMessage {
                Text(errorMessage)
                    .font(.footnote)
                    .foregroundStyle(HarborBrand.expensePalette[0])
            }

            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(HarborSurface.canvas.ignoresSafeArea())
        .padding()
        .onAppear {
            if !appLock.biometricsEnabled || !appLock.biometricsAvailable {
                showPasscodeEntry = true
            }
        }
    }

    private var passcodeField: some View {
        VStack(spacing: 16) {
            SecureField("Passcode", text: $passcode)
                .keyboardType(.numberPad)
                .textContentType(.oneTimeCode)
                .multilineTextAlignment(.center)
                .font(HarborTypography.amount(.title))
                .padding(14)
                .background(HarborSurface.elevated, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                .foregroundStyle(.white)
                .frame(maxWidth: 220)
                .onChange(of: passcode) { _, value in
                    let digits = String(value.filter(\.isNumber).prefix(6))
                    if digits != value { passcode = digits }
                    if AppLockService.isValidPasscode(digits) {
                        attemptPasscode()
                    }
                }

            Button("Unlock") {
                attemptPasscode()
            }
            .buttonStyle(.borderedProminent)
            .tint(HarborBrand.accent)
            .controlSize(.large)
            .disabled(passcode.count < 4)

            if appLock.biometricsEnabled, appLock.biometricsAvailable {
                Button("Use \(appLock.biometricsName)") {
                    showPasscodeEntry = false
                    errorMessage = nil
                    Task { _ = await appLock.unlockWithBiometrics() }
                }
                .foregroundStyle(HarborBrand.accent)
            }
        }
    }

    private func attemptPasscode() {
        if appLock.verifyPasscode(passcode) {
            errorMessage = nil
            passcode = ""
        } else {
            errorMessage = "Incorrect passcode."
            passcode = ""
        }
    }
}
