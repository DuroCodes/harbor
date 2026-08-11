import Foundation
import SwiftData

enum CategorySeeder {
    static func seedDefaults(into context: ModelContext) throws {
        let descriptor = FetchDescriptor<Category>()
        let existing = try context.fetch(descriptor)
        guard existing.isEmpty else { return }

        let defaults: [(DefaultCategoryKey, [String], Int)] = [
            (.income, ["INCOME"], 0),
            (.transfers, ["TRANSFER_IN", "TRANSFER_OUT"], 1),
            (.foodAndDining, ["FOOD_AND_DRINK"], 2),
            (.groceries, ["FOOD_AND_DRINK_GROCERIES"], 3),
            (.transportation, ["TRANSPORTATION"], 4),
            (.shopping, ["GENERAL_MERCHANDISE"], 5),
            (.entertainment, ["ENTERTAINMENT"], 6),
            (.billsAndUtilities, ["RENT_AND_UTILITIES"], 7),
            (.housing, ["RENT_AND_UTILITIES_RENT"], 8),
            (.healthcare, ["MEDICAL"], 9),
            (.travel, ["TRAVEL"], 10),
            (.other, ["OTHER", "BANK_FEES", "GENERAL_SERVICES"], 11),
        ]

        for (key, plaidKeys, order) in defaults {
            let category = Category(
                name: key.name,
                systemImage: key.systemImage,
                isIncome: key.isIncome,
                isTransfer: key.isTransfer,
                isDefault: true,
                sortOrder: order,
                plaidPrimaryKeys: plaidKeys
            )
            context.insert(category)
        }

        try context.save()
    }
}

enum DemoDataPurger {
    /// Removes previously seeded local demo institutions/accounts/transactions.
    static func removeIfPresent(into context: ModelContext) throws {
        let institutions = try context.fetch(FetchDescriptor<Institution>())
        let demoInstitutions = institutions.filter { $0.plaidItemID.hasPrefix("demo-") }
        guard !demoInstitutions.isEmpty else { return }

        for institution in demoInstitutions {
            context.delete(institution)
        }

        let cursors = try context.fetch(FetchDescriptor<SyncCursor>())
        for cursor in cursors where cursor.plaidItemID.hasPrefix("demo-") {
            context.delete(cursor)
        }

        // Always drop chart history when demo data goes away — leftover $100k
        // snapshots otherwise flatten the net-worth chart for months.
        let snapshots = try context.fetch(FetchDescriptor<NetWorthSnapshot>())
        for snapshot in snapshots {
            context.delete(snapshot)
        }

        try context.save()
    }
}

enum NetWorthSnapshotHousekeeping {
    /// Clears stale chart points left over from demo or old balances that dwarf current net worth.
    static func resetIfStale(into context: ModelContext, currentNetWorth: Decimal) throws {
        let snapshots = try context.fetch(FetchDescriptor<NetWorthSnapshot>())
        guard !snapshots.isEmpty else { return }

        let current = abs(NSDecimalNumber(decimal: currentNetWorth).doubleValue)
        let peak = snapshots
            .map { abs(NSDecimalNumber(decimal: $0.netWorth).doubleValue) }
            .max() ?? 0

        // e.g. months of ~$100k demo, then real ~$6k — wipe history and start over.
        let looksStale = peak > max(current * 4, 25_000) && current < peak * 0.35
        guard looksStale else { return }

        for snapshot in snapshots {
            context.delete(snapshot)
        }
        try context.save()
    }
}
