import SwiftUI
import Charts

enum CashFlowChartKind: String, CaseIterable, Identifiable {
    case sankey
    case pie

    var id: String { rawValue }

    var title: String {
        switch self {
        case .sankey: "Sankey"
        case .pie: "Pie"
        }
    }
}

struct CashFlowPieChartView: View {
    let data: CashFlowSankeyData
    var highlightedNodeID: String?
    var compact: Bool = false

    private var slices: [CashFlowNode] {
        let expenses = data.outflowNodes.filter { $0.kind == .expense && $0.amount > 0 }
        if expenses.isEmpty {
            return data.outflowNodes.filter { $0.amount > 0 }
        }
        return expenses
    }

    private var total: Double {
        max(slices.reduce(0) { $0 + NSDecimalNumber(decimal: $1.amount).doubleValue }, 0.0001)
    }

    /// Fit inside the shared half-tile card (padding is applied by the widget).
    private var chartHeight: CGFloat {
        compact ? HarborTheme.halfTileCardHeight - 20 : 200
    }

    var body: some View {
        if slices.isEmpty {
            EmptyView()
        } else if compact {
            // Label-free overview donut — title lives on the widget chrome.
            Chart(slices) { node in
                SectorMark(
                    angle: .value("Amount", NSDecimalNumber(decimal: node.amount).doubleValue),
                    innerRadius: .ratio(0.58),
                    angularInset: 1.2
                )
                .cornerRadius(2.5)
                .foregroundStyle(by: .value("Category", node.title))
                .opacity(opacity(for: node.id))
            }
            .chartForegroundStyleScale(
                domain: slices.map(\.title),
                range: HarborBrand.expensePalette
            )
            .chartLegend(.hidden)
            .chartBackground { _ in Color.clear }
            .frame(height: chartHeight)
            .frame(maxWidth: .infinity)
        } else {
            VStack(alignment: .leading, spacing: 12) {
                ZStack {
                    Chart(slices) { node in
                        SectorMark(
                            angle: .value("Amount", NSDecimalNumber(decimal: node.amount).doubleValue),
                            innerRadius: .ratio(0.60),
                            angularInset: 1.5
                        )
                        .cornerRadius(3)
                        .foregroundStyle(by: .value("Category", node.title))
                        .opacity(opacity(for: node.id))
                    }
                    .chartForegroundStyleScale(
                        domain: slices.map(\.title),
                        range: HarborBrand.expensePalette
                    )
                    .chartLegend(.hidden)
                    .chartBackground { _ in Color.clear }

                    VStack(spacing: 2) {
                        Text("Spending")
                            .font(.caption2)
                            .foregroundStyle(HarborSurface.labelMuted)
                        Text(HarborFormatters.money(Decimal(total), compact: total >= 1000))
                            .font(HarborTypography.amount(.title3))
                            .monospacedDigit()
                            .foregroundStyle(.white)
                            .minimumScaleFactor(0.7)
                            .lineLimit(1)
                    }
                    .allowsHitTesting(false)
                }
                .frame(height: chartHeight)
                .frame(maxWidth: .infinity)

                FlowLegend(nodes: slices, highlightedNodeID: highlightedNodeID)
            }
        }
    }

    private func opacity(for id: String) -> Double {
        guard let highlightedNodeID else { return 1 }
        return id == highlightedNodeID ? 1 : 0.28
    }
}

private struct FlowLegend: View {
    let nodes: [CashFlowNode]
    var highlightedNodeID: String?

    var body: some View {
        LazyVGrid(
            columns: [GridItem(.adaptive(minimum: 120), alignment: .leading)],
            alignment: .leading,
            spacing: 8
        ) {
            ForEach(Array(nodes.enumerated()), id: \.element.id) { index, node in
                HStack(spacing: 6) {
                    Circle()
                        .fill(HarborBrand.expensePalette[index % HarborBrand.expensePalette.count])
                        .frame(width: 8, height: 8)
                    Text(node.title)
                        .font(.caption)
                        .foregroundStyle(HarborSurface.labelMuted)
                        .lineLimit(1)
                }
                .opacity(highlightedNodeID == nil || highlightedNodeID == node.id ? 1 : 0.35)
            }
        }
    }
}
