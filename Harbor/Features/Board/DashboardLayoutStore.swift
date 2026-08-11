import Foundation
import Observation
import SwiftUI

enum DashboardWidgetWidth: String, Codable, Sendable {
    case full
    case half
}

/// Home board widgets.
enum DashboardWidgetKind: String, Codable, CaseIterable, Identifiable, Sendable {
    case netWorth
    case netWorthChart
    case assets
    case incomeSpending
    case recentActivity
    case sankey
    case pie
    case budgets

    var id: String { rawValue }

    var title: String {
        switch self {
        case .netWorth: "Net Worth"
        case .netWorthChart: "Net Worth Chart"
        case .assets: "Assets"
        case .incomeSpending: "Income & Spending"
        case .recentActivity: "Recent Activity"
        case .sankey: "Cash Flow"
        case .pie: "Spending Pie"
        case .budgets: "Budgets"
        }
    }

    var systemImage: String {
        switch self {
        case .netWorth: "dollarsign"
        case .netWorthChart: "chart.line.uptrend.xyaxis"
        case .assets: "square.stack.3d.up"
        case .incomeSpending: "arrow.left.arrow.right"
        case .recentActivity: "list.bullet"
        case .sankey: "chart.bar.xaxis"
        case .pie: "chart.pie"
        case .budgets: "chart.bar.doc.horizontal"
        }
    }

    var detail: String {
        switch self {
        case .netWorth: "Total net worth at a glance"
        case .netWorthChart: "Net worth over time"
        case .assets: "Cash, invested, and credit totals"
        case .incomeSpending: "Income and spending this month"
        case .recentActivity: "Latest transactions"
        case .sankey: "Income → spending Sankey chart"
        case .pie: "Spending breakdown pie chart"
        case .budgets: "Category budget progress this month"
        }
    }

    var defaultWidth: DashboardWidgetWidth {
        switch self {
        case .assets, .incomeSpending, .pie, .sankey:
            return .half
        default:
            return .full
        }
    }

    var allowsHalfWidth: Bool {
        switch self {
        case .netWorth, .recentActivity, .budgets:
            return false
        default:
            return true
        }
    }

    var allowsResize: Bool {
        allowsHalfWidth
    }
}

struct DashboardWidgetItem: Identifiable, Codable, Equatable, Hashable, Sendable {
    var id: UUID
    var kind: DashboardWidgetKind
    var width: DashboardWidgetWidth
    var showsTitle: Bool

    init(
        id: UUID = UUID(),
        kind: DashboardWidgetKind,
        width: DashboardWidgetWidth? = nil,
        showsTitle: Bool = false
    ) {
        self.id = id
        self.kind = kind
        self.width = width ?? kind.defaultWidth
        self.showsTitle = showsTitle
    }

    enum CodingKeys: String, CodingKey {
        case id, kind, width, showsTitle, size
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(UUID.self, forKey: .id)
        kind = try container.decode(DashboardWidgetKind.self, forKey: .kind)
        showsTitle = try container.decodeIfPresent(Bool.self, forKey: .showsTitle) ?? false

        if let width = try container.decodeIfPresent(DashboardWidgetWidth.self, forKey: .width) {
            self.width = width
        } else if let size = try container.decodeIfPresent(LegacyGridSize.self, forKey: .size) {
            self.width = size.columns <= 1 ? .half : .full
        } else {
            self.width = kind.defaultWidth
        }

        if !kind.allowsHalfWidth {
            self.width = .full
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(kind, forKey: .kind)
        try container.encode(width, forKey: .width)
        try container.encode(showsTitle, forKey: .showsTitle)
    }
}

private struct LegacyGridSize: Codable {
    var columns: Int
    var rows: Int
}

@MainActor
@Observable
final class DashboardLayoutStore {
    private static let storageKey = "harbor.dashboard.widgets.v10"

    var widgets: [DashboardWidgetItem] = []
    private var suppressPersist = false

    init() {
        if let data = UserDefaults.standard.data(forKey: Self.storageKey),
           let decoded = try? JSONDecoder().decode([DashboardWidgetItem].self, from: data),
           !decoded.isEmpty {
            widgets = decoded
        } else {
            widgets = Self.defaultLayout
            persist()
        }
    }

    static var defaultLayout: [DashboardWidgetItem] {
        [
            DashboardWidgetItem(kind: .netWorth, width: .full),
            DashboardWidgetItem(kind: .netWorthChart, width: .full),
            DashboardWidgetItem(kind: .assets, width: .half),
            DashboardWidgetItem(kind: .incomeSpending, width: .half),
            DashboardWidgetItem(kind: .budgets, width: .full),
            DashboardWidgetItem(kind: .recentActivity, width: .full),
        ]
    }

    var rows: [[DashboardWidgetItem]] {
        var result: [[DashboardWidgetItem]] = []
        var pendingHalf: DashboardWidgetItem?

        for widget in widgets {
            let useHalf = widget.width == .half && widget.kind.allowsHalfWidth
            if !useHalf {
                if let pending = pendingHalf {
                    result.append([pending])
                    pendingHalf = nil
                }
                result.append([widget])
            } else if let pending = pendingHalf {
                result.append([pending, widget])
                pendingHalf = nil
            } else {
                pendingHalf = widget
            }
        }

        if let pending = pendingHalf {
            result.append([pending])
        }
        return result
    }

    var availableToAdd: [DashboardWidgetKind] {
        DashboardWidgetKind.allCases.filter { kind in
            !widgets.contains(where: { $0.kind == kind })
        }
    }

    func add(_ kind: DashboardWidgetKind) {
        guard availableToAdd.contains(kind) else { return }
        widgets.append(DashboardWidgetItem(kind: kind))
        persist()
    }

    func remove(id: UUID) {
        widgets.removeAll { $0.id == id }
        persist()
    }

    func toggleWidth(id: UUID) {
        guard let index = widgets.firstIndex(where: { $0.id == id }) else { return }
        guard widgets[index].kind.allowsResize else { return }
        widgets[index].width = widgets[index].width == .full ? .half : .full
        persist()
    }

    func toggleTitle(id: UUID) {
        guard let index = widgets.firstIndex(where: { $0.id == id }) else { return }
        widgets[index].showsTitle.toggle()
        persist()
    }

    func beginDrag() {
        suppressPersist = true
    }

    func endDrag() {
        suppressPersist = false
        persist()
    }

    func relocate(id: UUID, toIndex destination: Int) {
        guard let from = widgets.firstIndex(where: { $0.id == id }) else { return }
        var to = destination
        if to > from { to -= 1 }
        to = min(max(to, 0), widgets.count - 1)
        guard from != to else { return }
        let item = widgets.remove(at: from)
        widgets.insert(item, at: to)
        if !suppressPersist { persist() }
    }

    func reset() {
        widgets = Self.defaultLayout
        persist()
    }

    private func persist() {
        guard !suppressPersist else { return }
        guard let data = try? JSONEncoder().encode(widgets) else { return }
        UserDefaults.standard.set(data, forKey: Self.storageKey)
    }
}
