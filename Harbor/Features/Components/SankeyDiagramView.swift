import SwiftUI
import UIKit

/// Cash-flow Sankey with a shared dollars→pixels scale.
/// Income bar height equals the sum of outflow bars (not the full chart including gaps).
struct SankeyDiagramView: View {
    let data: CashFlowSankeyData
    var highlightedNodeID: String?
    /// Half-width overview: ribbons + bars only, no side labels.
    var compact: Bool = false

    private var nodeWidth: CGFloat { compact ? 10 : 14 }
    private var labelWidth: CGFloat { compact ? 0 : 96 }
    private var columnGap: CGFloat { compact ? 0 : 10 }
    private var nodeGap: CGFloat { compact ? 4 : 10 }
    private var minNodeHeight: CGFloat { compact ? 10 : 30 }
    /// Match Assets / This month half tiles.
    private var compactChartHeight: CGFloat { HarborTheme.halfTileCardHeight - 20 }

    var body: some View {
        let prepared = SankeyPreparation.prepare(data)

        if prepared.isEmpty {
            EmptyView()
        } else {
            GeometryReader { geo in
                let canvasWidth = Self.canvasWidth(
                    for: geo.size.width,
                    labelWidth: labelWidth,
                    columnGap: columnGap,
                    nodeWidth: nodeWidth
                )
                let laidOut = SankeyLayout.compute(
                    prepared: prepared,
                    canvasWidth: canvasWidth,
                    nodeWidth: nodeWidth,
                    gap: nodeGap,
                    minNodeHeight: minNodeHeight,
                    maxChartHeight: compact ? compactChartHeight : nil
                )
                diagram(laidOut: laidOut)
                    .frame(maxHeight: .infinity, alignment: .center)
            }
            .frame(height: compact ? compactChartHeight : estimatedHeight(prepared: prepared))
        }
    }

    /// Renders a shareable bitmap at a fixed width (ImageRenderer needs a concrete size).
    @MainActor
    func renderImage(width: CGFloat = 390, scale: CGFloat = 3) -> UIImage? {
        let prepared = SankeyPreparation.prepare(data)
        guard !prepared.isEmpty else { return nil }

        let height = estimatedHeight(prepared: prepared)
        let export = SankeyDiagramView(data: data, highlightedNodeID: highlightedNodeID, compact: false)
            .padding(20)
            .frame(width: width, height: height + 40)
            .background(HarborSurface.elevated)

        let renderer = ImageRenderer(content: export)
        renderer.scale = scale
        return renderer.uiImage
    }

    private static func canvasWidth(
        for totalWidth: CGFloat,
        labelWidth: CGFloat,
        columnGap: CGFloat,
        nodeWidth: CGFloat
    ) -> CGFloat {
        max(totalWidth - (2 * labelWidth) - (2 * columnGap), nodeWidth * 2 + 40)
    }

    private func estimatedHeight(prepared: PreparedSankey) -> CGFloat {
        SankeyLayout.compute(
            prepared: prepared,
            canvasWidth: 200,
            nodeWidth: nodeWidth,
            gap: nodeGap,
            minNodeHeight: minNodeHeight,
            maxChartHeight: compact ? compactChartHeight : nil
        ).chartHeight
    }

    private func diagram(laidOut: SankeyLaidOutChart) -> some View {
        HStack(alignment: .top, spacing: columnGap) {
            if !compact {
                labelColumn(nodes: laidOut.leftLabels, width: labelWidth, alignment: .trailing)
            }

            ZStack(alignment: .topLeading) {
                Canvas { context, _ in
                    for link in laidOut.links {
                        let dimmed = shouldDim(link: link)
                        context.fill(
                            Path(link.path),
                            with: .linearGradient(
                                Gradient(colors: [
                                    link.color.opacity(dimmed ? 0.10 : 0.40),
                                    link.color.opacity(dimmed ? 0.06 : 0.22),
                                ]),
                                startPoint: link.gradientStart,
                                endPoint: link.gradientEnd
                            )
                        )
                    }
                    // Draw nodes after ribbons so left/right bars sit on top of flow ends.
                    for node in laidOut.nodes {
                        let dimmed = shouldDim(nodeID: node.id)
                        context.fill(
                            Path(roundedRect: node.rect, cornerRadius: compact ? 2 : 3),
                            with: .color(node.color.opacity(dimmed ? 0.35 : 1))
                        )
                    }
                }
            }
            .frame(maxWidth: .infinity)
            .frame(height: laidOut.chartHeight)

            if !compact {
                labelColumn(nodes: laidOut.rightLabels, width: labelWidth, alignment: .leading)
            }
        }
        .frame(height: laidOut.chartHeight)
    }

    private func labelColumn(
        nodes: [SankeyLabel],
        width: CGFloat,
        alignment: HorizontalAlignment
    ) -> some View {
        ZStack(alignment: .topLeading) {
            ForEach(nodes) { node in
                let dimmed = shouldDim(nodeID: node.id)
                VStack(alignment: alignment, spacing: 2) {
                    Text(node.title)
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(Color.white.opacity(dimmed ? 0.28 : 0.92))
                        .lineLimit(1)
                        .minimumScaleFactor(0.8)
                    Text(HarborFormatters.money(node.amount, compact: node.amount >= 1_000))
                        .font(.caption2)
                        .monospacedDigit()
                        .foregroundStyle(Color.white.opacity(dimmed ? 0.2 : 0.45))
                }
                .frame(width: width, alignment: alignment == .trailing ? .trailing : .leading)
                .frame(height: node.height, alignment: .center)
                .offset(y: node.minY)
            }
        }
        .frame(width: width, alignment: .topLeading)
    }

    private func shouldDim(nodeID: String) -> Bool {
        guard let highlightedNodeID else { return false }
        return nodeID != highlightedNodeID
    }

    private func shouldDim(link: SankeyLaidOutLink) -> Bool {
        guard let highlightedNodeID else { return false }
        return link.sourceID != highlightedNodeID && link.targetID != highlightedNodeID
    }
}

// MARK: - Preparation

private struct PreparedSankey {
    var sourceNodes: [CashFlowNode]
    var outflowNodes: [CashFlowNode]
    var links: [CashFlowLink]
    var mode: Mode

    enum Mode {
        case incomeToSpending
        case spendingOnly
    }

    var isEmpty: Bool { outflowNodes.isEmpty && sourceNodes.isEmpty }
}

private enum SankeyPreparation {
    static let maxExpenseNodes = 6

    static func prepare(_ data: CashFlowSankeyData) -> PreparedSankey {
        let expenses = data.outflowNodes.filter { $0.kind == .expense }
        let leftover = data.outflowNodes.first { $0.kind == .leftover }

        var outflow: [CashFlowNode] = []
        if expenses.count > maxExpenseNodes {
            let head = Array(expenses.prefix(maxExpenseNodes - 1))
            let tail = Array(expenses.suffix(from: maxExpenseNodes - 1))
            let otherAmount = tail.reduce(Decimal.zero) { $0 + $1.amount }
            outflow.append(contentsOf: head)
            if otherAmount > 0 {
                outflow.append(
                    CashFlowNode(
                        id: "out-other-grouped",
                        title: "Other",
                        amount: otherAmount,
                        systemImage: "ellipsis.circle",
                        kind: .expense
                    )
                )
            }
        } else {
            outflow = expenses
        }
        if let leftover, leftover.amount > 0 {
            outflow.append(leftover)
        }

        let incomeTotal = data.incomeNodes.reduce(Decimal.zero) { $0 + $1.amount }

        if incomeTotal > 0 {
            let source = CashFlowNode(
                id: "in-total",
                title: data.incomeNodes.count == 1 ? data.incomeNodes[0].title : "Income",
                amount: incomeTotal,
                systemImage: "arrow.down.circle",
                kind: .income
            )
            let links = outflow.map {
                CashFlowLink(
                    id: "\(source.id)->\($0.id)",
                    sourceID: source.id,
                    targetID: $0.id,
                    amount: $0.amount
                )
            }
            return PreparedSankey(
                sourceNodes: [source],
                outflowNodes: outflow,
                links: links,
                mode: .incomeToSpending
            )
        }

        // No income: still draw a complete diagram — Spending → categories.
        guard !outflow.isEmpty else {
            return PreparedSankey(sourceNodes: [], outflowNodes: [], links: [], mode: .spendingOnly)
        }

        let spendingTotal = outflow.reduce(Decimal.zero) { $0 + $1.amount }
        let source = CashFlowNode(
            id: "in-spending",
            title: "Spending",
            amount: spendingTotal,
            systemImage: "arrow.up.circle",
            kind: .expense
        )
        let links = outflow.map {
            CashFlowLink(
                id: "\(source.id)->\($0.id)",
                sourceID: source.id,
                targetID: $0.id,
                amount: $0.amount
            )
        }
        return PreparedSankey(
            sourceNodes: [source],
            outflowNodes: outflow,
            links: links,
            mode: .spendingOnly
        )
    }
}

// MARK: - Layout

private struct SankeyLabel: Identifiable {
    let id: String
    let title: String
    let amount: Decimal
    let minY: CGFloat
    let height: CGFloat
}

private struct SankeyLaidOutNode: Identifiable {
    let id: String
    let rect: CGRect
    let color: Color
}

private struct SankeyLaidOutLink: Identifiable {
    let id: String
    let sourceID: String
    let targetID: String
    let path: CGPath
    let color: Color
    let gradientStart: CGPoint
    let gradientEnd: CGPoint
}

private struct SankeyLaidOutChart {
    var nodes: [SankeyLaidOutNode]
    var links: [SankeyLaidOutLink]
    var leftLabels: [SankeyLabel]
    var rightLabels: [SankeyLabel]
    var chartHeight: CGFloat
}

private enum SankeyLayout {
    static func compute(
        prepared: PreparedSankey,
        canvasWidth: CGFloat,
        nodeWidth: CGFloat,
        gap: CGFloat,
        minNodeHeight: CGFloat,
        maxChartHeight: CGFloat? = nil
    ) -> SankeyLaidOutChart {
        let outflows = prepared.outflowNodes
        let sources = prepared.sourceNodes
        let outflowTotal = max(double(outflows.reduce(0) { $0 + $1.amount }), 0.0001)
        let gapTotal = gap * CGFloat(max(outflows.count - 1, 0))

        var heights: [CGFloat]
        let bodyHeight: CGFloat
        let chartHeight: CGFloat

        if let maxChartHeight {
            // Compact tile: exact fit so Cash flow pairs with Spending pie.
            let body = max(maxChartHeight - gapTotal, 1)
            heights = outflows.map { CGFloat(double($0.amount) / outflowTotal) * body }
            bodyHeight = heights.reduce(0, +)
            chartHeight = maxChartHeight
        } else {
            // Shared scale: bar heights proportional to dollars. Gaps are extra chrome, not flow.
            let idealBody = max(CGFloat(outflows.count) * 44, 120)
            heights = outflows.map { node -> CGFloat in
                max(CGFloat(double(node.amount) / outflowTotal) * idealBody, minNodeHeight)
            }
            // Keep proportions if floors inflated the total a lot.
            let heightSum = heights.reduce(0, +)
            if heightSum > idealBody * 1.8 {
                let scale = (idealBody * 1.35) / heightSum
                heights = heights.map { max($0 * scale, 22) }
            }
            bodyHeight = heights.reduce(0, +)
            chartHeight = bodyHeight + gapTotal
        }

        let leftX: CGFloat = 0
        let rightX = max(canvasWidth - nodeWidth, nodeWidth)

        // Right column with gaps.
        var rightNodes: [SankeyLaidOutNode] = []
        var rightLabels: [SankeyLabel] = []
        var y: CGFloat = 0
        for (index, node) in outflows.enumerated() {
            let h = heights[index]
            let rect = CGRect(x: rightX, y: y, width: nodeWidth, height: h)
            rightNodes.append(
                SankeyLaidOutNode(id: node.id, rect: rect, color: color(for: node, index: index, mode: prepared.mode))
            )
            rightLabels.append(
                SankeyLabel(id: node.id, title: node.title, amount: node.amount, minY: y, height: h)
            )
            y += h + gap
        }

        // Left source bar = body height only (excludes gaps) — true Sankey thickness.
        var leftNodes: [SankeyLaidOutNode] = []
        var leftLabels: [SankeyLabel] = []
        if let source = sources.first {
            let rect = CGRect(x: leftX, y: 0, width: nodeWidth, height: bodyHeight)
            leftNodes.append(
                SankeyLaidOutNode(
                    id: source.id,
                    rect: rect,
                    color: color(for: source, index: 0, mode: prepared.mode)
                )
            )
            leftLabels.append(
                SankeyLabel(
                    id: source.id,
                    title: source.title,
                    amount: source.amount,
                    minY: 0,
                    height: bodyHeight
                )
            )
        }

        // Ribbons: consume sequential slices of the source bar matching each outflow height.
        var sourceY: CGFloat = 0
        var links: [SankeyLaidOutLink] = []
        guard let source = leftNodes.first else {
            return SankeyLaidOutChart(
                nodes: leftNodes + rightNodes,
                links: [],
                leftLabels: leftLabels,
                rightLabels: rightLabels,
                chartHeight: chartHeight
            )
        }

        for right in rightNodes {
            let thickness = right.rect.height
            let start = CGPoint(x: source.rect.maxX, y: sourceY)
            let end = CGPoint(x: right.rect.minX, y: right.rect.minY)
            let path = ribbonPath(from: start, to: end, thickness: thickness)
            links.append(
                SankeyLaidOutLink(
                    id: "\(source.id)->\(right.id)",
                    sourceID: source.id,
                    targetID: right.id,
                    path: path,
                    color: right.color,
                    gradientStart: CGPoint(x: start.x, y: sourceY + thickness / 2),
                    gradientEnd: CGPoint(x: end.x, y: end.y + thickness / 2)
                )
            )
            sourceY += thickness
        }

        return SankeyLaidOutChart(
            nodes: leftNodes + rightNodes,
            links: links,
            leftLabels: leftLabels,
            rightLabels: rightLabels,
            chartHeight: chartHeight
        )
    }

    private static func ribbonPath(from start: CGPoint, to end: CGPoint, thickness: CGFloat) -> CGPath {
        let path = CGMutablePath()
        let midX = (start.x + end.x) / 2
        path.move(to: start)
        path.addCurve(
            to: end,
            control1: CGPoint(x: midX, y: start.y),
            control2: CGPoint(x: midX, y: end.y)
        )
        path.addLine(to: CGPoint(x: end.x, y: end.y + thickness))
        path.addCurve(
            to: CGPoint(x: start.x, y: start.y + thickness),
            control1: CGPoint(x: midX, y: end.y + thickness),
            control2: CGPoint(x: midX, y: start.y + thickness)
        )
        path.closeSubpath()
        return path
    }

    private static func color(for node: CashFlowNode, index: Int, mode: PreparedSankey.Mode) -> Color {
        switch node.kind {
        case .income:
            return HarborBrand.inflow
        case .leftover:
            return HarborBrand.accent
        case .expense:
            if node.id == "in-spending" {
                return HarborBrand.outflowSource
            }
            return HarborBrand.expensePalette[index % HarborBrand.expensePalette.count]
        }
    }

    private static func double(_ value: Decimal) -> Double {
        NSDecimalNumber(decimal: value).doubleValue
    }
}
