import Foundation
import Observation

enum AppTab: Int, Hashable, Sendable {
    case dashboard = 0
    case cashFlow = 1
    case activity = 2
    case accounts = 3
    case budgets = 4
}

/// Cross-tab navigation for dashboard widget taps.
@MainActor
@Observable
final class AppNavigator {
    var selectedTab: AppTab = .dashboard
    /// When set, Activity opens this transaction detail then clears it.
    var pendingTransactionID: UUID?
    var accountsAvailable: Bool = false
    var showSettings = false

    func openCashFlow() {
        guard accountsAvailable else { return }
        pendingTransactionID = nil
        selectedTab = .cashFlow
    }

    func openAccounts() {
        guard accountsAvailable else { return }
        pendingTransactionID = nil
        selectedTab = .accounts
    }

    func openActivity() {
        guard accountsAvailable else { return }
        pendingTransactionID = nil
        selectedTab = .activity
    }

    func openBudgets() {
        guard accountsAvailable else { return }
        pendingTransactionID = nil
        selectedTab = .budgets
    }

    func openSettings() {
        showSettings = true
    }

    func openTransaction(id: UUID) {
        guard accountsAvailable else { return }
        pendingTransactionID = id
        selectedTab = .activity
    }
}
