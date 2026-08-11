import Foundation
import Security

enum KeychainStore {
    enum Key: String {
        case proxyAPIKey = "harbor.proxy.apiKey"
        case proxyBaseURL = "harbor.proxy.baseURL"
        case appLockEnabled = "harbor.security.appLockEnabled"
        case appLockPasscodeHash = "harbor.security.appLockPasscodeHash"
        case appLockBiometricsEnabled = "harbor.security.appLockBiometricsEnabled"
    }

    static func set(_ value: String, for key: Key) throws {
        let data = Data(value.utf8)
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key.rawValue,
            kSecAttrService as String: "me.durocodes.Harbor",
        ]

        SecItemDelete(query as CFDictionary)

        var attributes = query
        attributes[kSecValueData as String] = data
        attributes[kSecAttrAccessible as String] = kSecAttrAccessibleWhenUnlockedThisDeviceOnly

        let status = SecItemAdd(attributes as CFDictionary, nil)
        guard status == errSecSuccess else {
            throw KeychainError.unexpectedStatus(status)
        }
    }

    static func string(for key: Key) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key.rawValue,
            kSecAttrService as String: "me.durocodes.Harbor",
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]

        var item: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &item)
        guard status == errSecSuccess,
              let data = item as? Data,
              let value = String(data: data, encoding: .utf8) else {
            return nil
        }
        return value
    }

    static func delete(_ key: Key) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key.rawValue,
            kSecAttrService as String: "me.durocodes.Harbor",
        ]
        SecItemDelete(query as CFDictionary)
    }

    enum KeychainError: Error {
        case unexpectedStatus(OSStatus)
    }
}
