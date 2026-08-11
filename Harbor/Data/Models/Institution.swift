import Foundation
import SwiftData

@Model
final class Institution {
    @Attribute(.unique) var id: UUID
    var plaidItemID: String
    var name: String
    var logoIdentifier: String?
    var createdAt: Date
    var lastSyncedAt: Date?
    var lastSyncError: String?
    var isActive: Bool

    @Relationship(deleteRule: .cascade, inverse: \Account.institution)
    var accounts: [Account]

    init(
        id: UUID = UUID(),
        plaidItemID: String,
        name: String,
        logoIdentifier: String? = nil,
        createdAt: Date = .now,
        lastSyncedAt: Date? = nil,
        lastSyncError: String? = nil,
        isActive: Bool = true,
        accounts: [Account] = []
    ) {
        self.id = id
        self.plaidItemID = plaidItemID
        self.name = name
        self.logoIdentifier = logoIdentifier
        self.createdAt = createdAt
        self.lastSyncedAt = lastSyncedAt
        self.lastSyncError = lastSyncError
        self.isActive = isActive
        self.accounts = accounts
    }
}
