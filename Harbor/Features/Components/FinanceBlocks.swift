import SwiftUI
import Charts

/// Shared Home / Dashboard blocks so widgets match Home exactly.

struct NetWorthHeroBlock: View {
    let netWorth: Decimal
    var compact: Bool = false

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Net worth")
                .font(.subheadline)
                .foregroundStyle(HarborSurface.labelMuted)
            Text(HarborFormatters.money(netWorth))
                .font(compact ? HarborTypography.amount(.title) : HarborTypography.heroBalance)
                .monospacedDigit()
                .foregroundStyle(.white)
                .contentTransition(.numericText())
                .minimumScaleFactor(0.6)
                .lineLimit(1)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(compact ? 14 : 0)
        .background {
            if compact {
                RoundedRectangle(cornerRadius: HarborTheme.cardCorner, style: .continuous)
                    .fill(HarborSurface.elevated)
            }
        }
    }
}

struct IncomeSpendingCard: View {
    let income: Decimal
    let spending: Decimal
    /// Vertical stacked metrics (dashboard half-tile). Home uses the side-by-side layout.
    var compact: Bool = false
    var showsHeader: Bool = false

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            if showsHeader {
                Text("This month")
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(HarborSurface.labelSecondary)
            }

            if compact {
                VStack(alignment: .leading, spacing: 0) {
                    compactCell(title: "Income", value: income, positive: true)
                    Spacer(minLength: 10)
                    compactCell(title: "Spending", value: spending, positive: false)
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 12)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
                .frame(height: HarborTheme.halfTileCardHeight)
                .background(
                    HarborSurface.elevated,
                    in: RoundedRectangle(cornerRadius: HarborTheme.cardCorner, style: .continuous)
                )
            } else {
                HStack(spacing: 0) {
                    cell(title: "Income", value: income, positive: true)
                    HarborSurface.hairline
                        .frame(width: 1)
                        .padding(.vertical, 8)
                    cell(title: "Spending", value: spending, positive: false)
                }
                .harborCard()
            }
        }
        .frame(maxHeight: compact ? .infinity : nil, alignment: .top)
    }

    private func cell(title: String, value: Decimal, positive: Bool) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title)
                .font(.caption)
                .foregroundStyle(HarborSurface.labelMuted)
            Text(HarborFormatters.money(value))
                .font(HarborTypography.amount(.title3))
                .monospacedDigit()
                .foregroundStyle(positive ? HarborTheme.positive : .white)
                .lineLimit(1)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
    }

    private func compactCell(title: String, value: Decimal, positive: Bool) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.caption)
                .foregroundStyle(HarborSurface.labelMuted)
            Text(HarborFormatters.money(value))
                .font(HarborTypography.amount(.body))
                .monospacedDigit()
                .foregroundStyle(positive ? HarborTheme.positive : .white)
                .lineLimit(1)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct AssetsBlock: View {
    let cash: Decimal
    let investments: Decimal
    let credit: Decimal
     /// Half-width tile: label | value only (no icons) so amounts fit.
    var compact: Bool = false
    var showsHeader: Bool = true

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            if showsHeader {
                Text("Assets")
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(HarborSurface.labelSecondary)
            }

            if compact {
                VStack(spacing: 0) {
                    compactRow(title: "Cash", value: cash)
                    HarborHairline(leadingInset: 12)
                    compactRow(title: "Invested", value: investments)
                    HarborHairline(leadingInset: 12)
                    compactRow(title: "Credit", value: credit)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
                .frame(height: HarborTheme.halfTileCardHeight)
                .background(
                    HarborSurface.elevated,
                    in: RoundedRectangle(cornerRadius: HarborTheme.cardCorner, style: .continuous)
                )
            } else {
                VStack(spacing: 0) {
                    row(title: "Cash", systemImage: AccountGroup.cash.systemImage, value: cash)
                    HarborHairline(leadingInset: 52)
                    row(title: "Invested", systemImage: AccountGroup.investments.systemImage, value: investments)
                    HarborHairline(leadingInset: 52)
                    row(title: "Credit", systemImage: AccountGroup.credit.systemImage, value: credit)
                }
                .harborCard(padding: 4)
            }
        }
        .frame(maxHeight: compact ? .infinity : nil, alignment: .top)
    }

    private func row(title: String, systemImage: String, value: Decimal) -> some View {
        HStack(spacing: 12) {
            Image(systemName: systemImage)
                .font(.system(size: 15, weight: .light))
                .foregroundStyle(HarborSurface.labelMuted)
                .frame(width: 24, height: 24)

            Text(title)
                .font(.subheadline)
                .foregroundStyle(HarborSurface.labelMuted)

            Spacer(minLength: 8)

            Text(HarborFormatters.money(value))
                .font(HarborTypography.amount(.title3))
                .monospacedDigit()
                .foregroundStyle(.white)
                .lineLimit(1)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
    }

    private func compactRow(title: String, value: Decimal) -> some View {
        HStack(spacing: 6) {
            Text(title)
                .font(.caption)
                .foregroundStyle(HarborSurface.labelMuted)
                .lineLimit(1)
                .layoutPriority(1)

            Spacer(minLength: 2)

            Text(HarborFormatters.money(value))
                .font(HarborTypography.amount(.caption))
                .monospacedDigit()
                .foregroundStyle(.white)
                .lineLimit(1)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
    }
}

struct RecentTransactionsBlock: View {
    let transactions: [Transaction]
    var compact: Bool = false
    var showsHeader: Bool = true
    var onHeaderTap: (() -> Void)?
    var onTransactionTap: ((Transaction) -> Void)?

    var body: some View {
        VStack(alignment: .leading, spacing: compact ? 8 : 12) {
            if showsHeader {
                Text("Recent")
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(HarborSurface.labelSecondary)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .contentShape(Rectangle())
                    .onTapGesture { onHeaderTap?() }
                    .accessibilityAddTraits(onHeaderTap == nil ? [] : .isButton)
            }

            if transactions.isEmpty {
                Text("No recent activity.")
                    .font(.subheadline)
                    .foregroundStyle(HarborSurface.labelMuted)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(16)
                    .harborCard()
            } else {
                VStack(spacing: 0) {
                    ForEach(transactions, id: \.id) { transaction in
                        TransactionRow(transaction: transaction)
                            .padding(.horizontal, compact ? 10 : 14)
                            .padding(.vertical, compact ? 8 : 10)
                            .contentShape(Rectangle())
                            .onTapGesture { onTransactionTap?(transaction) }
                            .accessibilityAddTraits(onTransactionTap == nil ? [] : .isButton)
                        if transaction.id != transactions.last?.id {
                            HarborHairline(leadingInset: compact ? 10 : 50)
                        }
                    }
                }
                .modifier(OptionalCardModifier(enabled: showsHeader, padding: 0))
            }
        }
    }
}

private struct OptionalCardModifier: ViewModifier {
    var enabled: Bool
    var padding: CGFloat = 4

    func body(content: Content) -> some View {
        if enabled {
            content.harborCard(padding: padding)
        } else {
            content
        }
    }
}

struct NetWorthChartBlock: View {
    let snapshots: [NetWorthSnapshot]
    var compact: Bool = false

    private var chartSnapshots: [NetWorthSnapshot] {
        snapshots.sorted { $0.date < $1.date }
    }

    private var chartYDomain: ClosedRange<Double> {
        let values = chartSnapshots.map { NSDecimalNumber(decimal: $0.netWorth).doubleValue }
        guard let minValue = values.min(), let maxValue = values.max() else {
            return 0...1
        }
        let lo = min(minValue, 0)
        let hi = max(maxValue, 0)
        if lo == hi {
            let pad = max(abs(hi) * 0.1, 100)
            return (hi - pad)...(hi + pad)
        }
        let pad = (hi - lo) * 0.12
        return (lo - pad * 0.2)...(hi + pad)
    }

    private var chartXDomain: ClosedRange<Date> {
        guard let first = chartSnapshots.first?.date, let last = chartSnapshots.last?.date else {
            return Date()...Date()
        }
        if first == last {
            let dayBefore = Calendar.current.date(byAdding: .day, value: -1, to: first) ?? first
            return dayBefore...last
        }
        return first...last
    }

    private var chartSpanDays: Int {
        Calendar.current.dateComponents([.day], from: chartXDomain.lowerBound, to: chartXDomain.upperBound).day ?? 0
    }

    var body: some View {
        if chartSnapshots.count < 2 {
            Text("Not enough history yet.")
                .font(.subheadline)
                .foregroundStyle(HarborSurface.labelMuted)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(16)
                .harborCard()
        } else {
            Chart {
                ForEach(chartSnapshots, id: \.id) { snapshot in
                    LineMark(
                        x: .value("Date", snapshot.date),
                        y: .value("Net Worth", NSDecimalNumber(decimal: snapshot.netWorth).doubleValue)
                    )
                    .interpolationMethod(.linear)
                    .foregroundStyle(HarborBrand.accent)
                    .lineStyle(StrokeStyle(lineWidth: 2))

                    AreaMark(
                        x: .value("Date", snapshot.date),
                        y: .value("Net Worth", NSDecimalNumber(decimal: snapshot.netWorth).doubleValue)
                    )
                    .interpolationMethod(.linear)
                    .foregroundStyle(
                        LinearGradient(
                            colors: [HarborBrand.accent.opacity(0.28), HarborBrand.accent.opacity(0.0)],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )
                }
            }
            .chartXScale(domain: chartXDomain)
            .chartYScale(domain: chartYDomain)
            .chartXAxis {
                AxisMarks(values: chartXAxisValues) { value in
                    AxisGridLine(stroke: StrokeStyle(lineWidth: 0.5))
                        .foregroundStyle(HarborSurface.hairline)
                    AxisTick(stroke: StrokeStyle(lineWidth: 0.5))
                        .foregroundStyle(HarborSurface.hairline)
                    AxisValueLabel(collisionResolution: .greedy) {
                        if let date = value.as(Date.self) {
                            Text(chartXLabel(for: date))
                                .font(.caption2)
                                .foregroundStyle(HarborSurface.labelMuted)
                        }
                    }
                }
            }
            .chartYAxis {
                if compact {
                    AxisMarks(position: .leading, values: .automatic(desiredCount: 3)) { _ in
                        AxisGridLine(stroke: StrokeStyle(lineWidth: 0.5))
                            .foregroundStyle(HarborSurface.hairline)
                    }
                } else {
                    AxisMarks(position: .leading, values: .automatic(desiredCount: 4)) { value in
                        AxisGridLine(stroke: StrokeStyle(lineWidth: 0.5))
                            .foregroundStyle(HarborSurface.hairline)
                        AxisValueLabel {
                            if let amount = value.as(Double.self) {
                                Text(chartYLabel(amount))
                                    .font(.caption2)
                                    .foregroundStyle(HarborSurface.labelMuted)
                            }
                        }
                    }
                }
            }
            .chartLegend(.hidden)
            .frame(height: compact ? 140 : 180)
            .padding(.top, 4)
            .padding(compact ? 10 : 0)
            .background {
                if compact {
                    RoundedRectangle(cornerRadius: HarborTheme.cardCorner, style: .continuous)
                        .fill(HarborSurface.elevated)
                }
            }
        }
    }

    private var chartXAxisValues: [Date] {
        let calendar = Calendar.current
        let start = chartXDomain.lowerBound
        let end = chartXDomain.upperBound
        if chartSpanDays <= 14 {
            return [start, end]
        }
        if chartSpanDays <= 60 {
            var dates: [Date] = [start]
            var cursor = calendar.date(byAdding: .weekOfYear, value: 1, to: calendar.startOfDay(for: start)) ?? start
            while cursor < end {
                dates.append(cursor)
                cursor = calendar.date(byAdding: .weekOfYear, value: 1, to: cursor) ?? end
            }
            if dates.last != end { dates.append(end) }
            return dates
        }
        var dates: [Date] = []
        var components = calendar.dateComponents([.year, .month], from: start)
        components.day = 1
        var cursor = calendar.date(from: components) ?? start
        if cursor < start {
            cursor = calendar.date(byAdding: .month, value: 1, to: cursor) ?? start
        }
        while cursor <= end {
            dates.append(cursor)
            cursor = calendar.date(byAdding: .month, value: 1, to: cursor) ?? end.addingTimeInterval(1)
        }
        if dates.isEmpty {
            return [start, end]
        }
        return dates
    }

    private func chartXLabel(for date: Date) -> String {
        let formatter = DateFormatter()
        formatter.locale = .current
        if chartSpanDays <= 45 {
            formatter.setLocalizedDateFormatFromTemplate("MMMd")
        } else {
            formatter.setLocalizedDateFormatFromTemplate("MMM")
        }
        return formatter.string(from: date)
    }

    private func chartYLabel(_ amount: Double) -> String {
        let absAmount = abs(amount)
        if absAmount >= 1_000 {
            return HarborFormatters.money(Decimal(amount), compact: true)
        }
        return HarborFormatters.money(Decimal(amount))
    }
}
