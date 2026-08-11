import Foundation
import LocalAuthentication
import CryptoKit

@Observable
@MainActor
final class AppLockService {
    private(set) var isUnlocked = false

    /// App lock is on when a Harbor passcode is stored.
    private(set) var hasPasscode: Bool = false

    /// Prefer Face ID / Touch ID when unlocking (passcode always remains available).
    var biometricsEnabled: Bool {
        didSet {
            try? KeychainStore.set(biometricsEnabled ? "1" : "0", for: .appLockBiometricsEnabled)
        }
    }

    var isEnabled: Bool { hasPasscode }

    var biometricsAvailable: Bool {
        let context = LAContext()
        var error: NSError?
        return context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error)
    }

    var biometricsName: String {
        let context = LAContext()
        _ = context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: nil)
        switch context.biometryType {
        case .faceID: return "Face ID"
        case .touchID: return "Touch ID"
        case .opticID: return "Optic ID"
        default: return "Biometrics"
        }
    }

    init() {
        hasPasscode = KeychainStore.string(for: .appLockPasscodeHash) != nil
        biometricsEnabled = KeychainStore.string(for: .appLockBiometricsEnabled) == "1"
        // Migrate legacy "Face ID only" toggle: turn on lock with device auth isn't enough —
        // require a Harbor passcode going forward. If legacy flag was on but no passcode, unlock.
        let legacyEnabled = KeychainStore.string(for: .appLockEnabled) == "1"
        if legacyEnabled && !hasPasscode {
            KeychainStore.delete(.appLockEnabled)
            biometricsEnabled = biometricsAvailable
            try? KeychainStore.set(biometricsEnabled ? "1" : "0", for: .appLockBiometricsEnabled)
        }
        isUnlocked = !hasPasscode
    }

    func setPasscode(_ passcode: String) throws {
        let normalized = Self.normalize(passcode)
        guard Self.isValidPasscode(normalized) else {
            throw AppLockError.invalidPasscode
        }
        let hash = Self.hash(normalized)
        try KeychainStore.set(hash, for: .appLockPasscodeHash)
        hasPasscode = true
        KeychainStore.delete(.appLockEnabled)
        if biometricsAvailable && !biometricsEnabled {
            biometricsEnabled = true
        }
        isUnlocked = true
    }

    func clearPasscode() {
        KeychainStore.delete(.appLockPasscodeHash)
        KeychainStore.delete(.appLockBiometricsEnabled)
        KeychainStore.delete(.appLockEnabled)
        hasPasscode = false
        biometricsEnabled = false
        isUnlocked = true
    }

    func verifyPasscode(_ passcode: String) -> Bool {
        guard let stored = KeychainStore.string(for: .appLockPasscodeHash) else { return false }
        let ok = Self.hash(Self.normalize(passcode)) == stored
        if ok { isUnlocked = true }
        return ok
    }

    func unlockWithBiometrics() async -> Bool {
        guard hasPasscode else {
            isUnlocked = true
            return true
        }
        guard biometricsEnabled, biometricsAvailable else { return false }

        let context = LAContext()
        context.localizedFallbackTitle = ""
        do {
            let success = try await context.evaluatePolicy(
                .deviceOwnerAuthenticationWithBiometrics,
                localizedReason: "Unlock Harbor to view your finances"
            )
            isUnlocked = success
            return success
        } catch {
            isUnlocked = false
            return false
        }
    }

    /// Called on launch — try biometrics when enabled, otherwise wait for passcode UI.
    func unlock() async {
        guard hasPasscode else {
            isUnlocked = true
            return
        }
        if biometricsEnabled {
            _ = await unlockWithBiometrics()
        }
    }

    func lock() {
        if hasPasscode {
            isUnlocked = false
        }
    }

    static func isValidPasscode(_ passcode: String) -> Bool {
        let digits = normalize(passcode)
        return digits.count >= 4 && digits.count <= 6 && digits.allSatisfy(\.isNumber)
    }

    private static func normalize(_ passcode: String) -> String {
        passcode.filter(\.isNumber)
    }

    private static func hash(_ passcode: String) -> String {
        let digest = SHA256.hash(data: Data(passcode.utf8))
        return digest.map { String(format: "%02x", $0) }.joined()
    }
}

enum AppLockError: LocalizedError {
    case invalidPasscode

    var errorDescription: String? {
        switch self {
        case .invalidPasscode:
            return "Passcode must be 4–6 digits."
        }
    }
}
