import SwiftUI
import SwiftData
import UIKit

struct CashFlowView: View {
    @Query(sort: \Transaction.date, order: .reverse)
    private var transactions: [Transaction]

    @State private var monthOffset = 0
    @State private var selectedNodeID: String?
    @State private var chartKind: CashFlowChartKind = .sankey
    @State private var shareImage: UIImage?
    @State private var showShare = false
    @State private var exportError: String?

    private var monthDate: Date {
        Calendar.current.date(byAdding: .month, value: monthOffset, to: .now) ?? .now
    }

    private var monthTitle: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMMM yyyy"
        return formatter.string(from: monthDate)
    }

    private var sankeyData: CashFlowSankeyData {
        FinancialCalculator.cashFlowSankey(
            transactions: transactions.map(Self.input(from:)),
            in: monthDate
        )
    }

    private var heroTitle: String {
        if sankeyData.totalIncome == 0 && sankeyData.totalSpending > 0 {
            return "Spending"
        }
        return sankeyData.leftover >= 0 ? "Left over" : "Short"
    }

    private var heroValue: Decimal {
        if sankeyData.totalIncome == 0 && sankeyData.totalSpending > 0 {
            return sankeyData.totalSpending
        }
        return abs(sankeyData.leftover)
    }

    private var heroPositive: Bool {
        if sankeyData.totalIncome == 0 && sankeyData.totalSpending > 0 {
            return false
        }
        return sankeyData.leftover >= 0
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: HarborTheme.sectionSpacing) {
                    monthPicker

                    if sankeyData.isEmpty {
                        emptyState
                    } else {
                        hero
                        summaryCard
                        chartSection
                        breakdownSection
                    }
                }
                .padding(.horizontal, 20)
                .padding(.top, 8)
                .padding(.bottom, 24)
            }
            .harborScreen()
            .harborInlineTitle("Cash Flow")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    if !sankeyData.isEmpty {
                        HarborHeaderButton(systemImage: "square.and.arrow.up", accessibilityLabel: "Share cash flow chart") {
                            exportChart()
                        }
                    }
                }
            }
            .sheet(isPresented: $showShare) {
                if let shareImage {
                    ShareSheet(items: [shareImage])
                }
            }
            .alert("Couldn’t Export", isPresented: Binding(
                get: { exportError != nil },
                set: { if !$0 { exportError = nil } }
            )) {
                Button("OK", role: .cancel) { exportError = nil }
            } message: {
                Text(exportError ?? "")
            }
        }
    }

    private var emptyState: some View {
        ContentUnavailableView(
            "No activity",
            systemImage: "chart.bar",
            description: Text("Nothing recorded for \(monthTitle).")
        )
        .foregroundStyle(HarborSurface.labelMuted)
        .frame(maxWidth: .infinity)
        .padding(.top, 64)
    }

    private var monthPicker: some View {
        HStack(spacing: 14) {
            Button {
                withAnimation(.snappy) { monthOffset -= 1 }
            } label: {
                Image(systemName: "chevron.left")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(HarborSurface.labelSecondary)
                    .frame(width: 32, height: 32)
                    .contentShape(Rectangle())
            }

            Text(monthTitle)
                .font(.subheadline.weight(.medium))
                .foregroundStyle(HarborSurface.labelMuted)
                .frame(minWidth: 140)
                .multilineTextAlignment(.center)

            Button {
                withAnimation(.snappy) { monthOffset = min(monthOffset + 1, 0) }
            } label: {
                Image(systemName: "chevron.right")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(HarborSurface.labelSecondary)
                    .frame(width: 32, height: 32)
                    .contentShape(Rectangle())
            }
            .disabled(monthOffset >= 0)
            .opacity(monthOffset >= 0 ? 0.3 : 1)
        }
        .buttonStyle(.plain)
        .frame(maxWidth: .infinity)
        .padding(.bottom, 4)
        .accessibilityElement(children: .combine)
        .accessibilityLabel(monthTitle)
    }

    private var hero: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(heroTitle)
                .font(.subheadline)
                .foregroundStyle(HarborSurface.labelMuted)
            Text(HarborFormatters.money(heroValue))
                .font(HarborTypography.heroBalance)
                .monospacedDigit()
                .foregroundStyle(heroPositive ? HarborTheme.positive : .white)
                .contentTransition(.numericText())
                .minimumScaleFactor(0.6)
                .lineLimit(1)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var summaryCard: some View {
        HStack(spacing: 0) {
            summaryCell(title: "Income", value: sankeyData.totalIncome, positive: true)
            HarborSurface.hairline
                .frame(width: 1)
                .padding(.vertical, 8)
            summaryCell(title: "Spending", value: sankeyData.totalSpending, positive: false)
        }
        .harborCard()
    }

    private func summaryCell(title: String, value: Decimal, positive: Bool) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title)
                .font(.caption)
                .foregroundStyle(HarborSurface.labelMuted)
            Text(HarborFormatters.money(value))
                .font(HarborTypography.amount(.title3))
                .monospacedDigit()
                .foregroundStyle(positive ? HarborTheme.positive : .white)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
    }

    private var chartSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text(chartKind == .sankey ? "Flow" : "Spending")
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(HarborSurface.labelSecondary)
                Spacer()
                Menu {
                    ForEach(CashFlowChartKind.allCases) { kind in
                        Button {
                            withAnimation(.snappy) { chartKind = kind }
                        } label: {
                            if chartKind == kind {
                                Label(kind.title, systemImage: "checkmark")
                            } else {
                                Text(kind.title)
                            }
                        }
                    }
                } label: {
                    HStack(spacing: 4) {
                        Text(chartKind.title)
                            .font(.caption.weight(.medium))
                        Image(systemName: "chevron.up.chevron.down")
                            .font(.caption2.weight(.semibold))
                    }
                    .foregroundStyle(HarborSurface.labelMuted)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(HarborSurface.elevated, in: Capsule())
                }
            }

            Group {
                switch chartKind {
                case .sankey:
                    SankeyDiagramView(data: sankeyData, highlightedNodeID: selectedNodeID)
                case .pie:
                    CashFlowPieChartView(data: sankeyData, highlightedNodeID: selectedNodeID)
                }
            }
            .padding(.vertical, 4)
        }
    }

    private var breakdownSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Breakdown")
                .font(.subheadline.weight(.medium))
                .foregroundStyle(HarborSurface.labelSecondary)

            VStack(spacing: 0) {
                ForEach(sankeyData.outflowNodes) { node in
                    Button {
                        withAnimation(.snappy(duration: 0.25)) {
                            selectedNodeID = selectedNodeID == node.id ? nil : node.id
                        }
                    } label: {
                        HStack(spacing: 12) {
                            Image(systemName: node.systemImage ?? (node.kind == .leftover ? "checkmark.circle" : "circle"))
                                .font(.system(size: 15, weight: .light))
                                .foregroundStyle(HarborSurface.labelMuted)
                                .frame(width: 24, height: 24)

                            Text(node.title)
                                .font(.subheadline)
                                .foregroundStyle(HarborSurface.labelMuted)

                            Spacer(minLength: 8)

                            Text(HarborFormatters.money(node.amount))
                                .font(HarborTypography.amount(.title3))
                                .monospacedDigit()
                                .foregroundStyle(node.kind == .leftover ? HarborTheme.positive : .white)
                        }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 14)
                        .opacity(selectedNodeID == nil || selectedNodeID == node.id ? 1 : 0.35)
                    }
                    .buttonStyle(.plain)

                    if node.id != sankeyData.outflowNodes.last?.id {
                        HarborHairline(leadingInset: 52)
                    }
                }
            }
            .harborCard(padding: 4)
        }
    }

    private func exportChart() {
        let image = SankeyDiagramView(data: sankeyData).renderImage()
        guard let image else {
            exportError = "The chart couldn’t be rendered."
            return
        }
        shareImage = image
        showShare = true
    }

    static func input(from transaction: Transaction) -> CashFlowTransactionInput {
        CashFlowTransactionInput(
            amount: transaction.amount,
            date: transaction.date,
            status: transaction.status,
            isIncome: transaction.category?.isIncome ?? false,
            isTransfer: transaction.category?.isTransfer ?? false,
            categoryID: transaction.category?.id.uuidString,
            categoryName: transaction.category?.name,
            categoryImage: transaction.category?.systemImage
        )
    }
}

private struct ShareSheet: UIViewControllerRepresentable {
    let items: [Any]

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items, applicationActivities: nil)
    }

    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}
