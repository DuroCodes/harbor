import SwiftUI
import SwiftData
import UIKit

/// Customizable widget board — content-sized half/full width tiles.
struct BoardView: View {
    @Environment(AppNavigator.self) private var navigator
    @Query(filter: #Predicate<Account> { $0.isActive && !$0.isHidden })
    private var accounts: [Account]

    @State private var layout = DashboardLayoutStore()
    @State private var isEditing = false
    @State private var showAddSheet = false
    @State private var showConnect = false

    @State private var draggingID: UUID?
    @State private var dragTranslation: CGSize = .zero
    /// Frozen global origin of the source slot at drag start.
    @State private var dragStartFrameOrigin: CGPoint = .zero
    /// Frozen size of the source slot so the floating copy can't balloon.
    @State private var dragSourceSize: CGSize = .zero
    @State private var widgetFrames: [UUID: CGRect] = [:]
    @State private var boardOrigin: CGPoint = .zero
    @State private var lastTargetIndex: Int?

    private let columnSpacing: CGFloat = 12
    private let rowSpacing: CGFloat = 14

    private var hasAccounts: Bool { !accounts.isEmpty }

    private var jiggleActive: Bool {
        isEditing && draggingID == nil
    }

    var body: some View {
        NavigationStack {
            GeometryReader { _ in
                ScrollView {
                    ZStack(alignment: .topLeading) {
                        VStack(alignment: .leading, spacing: rowSpacing) {
                            if !hasAccounts {
                                connectAccountsPrompt
                            } else if layout.widgets.isEmpty {
                                emptyBoard
                            } else {
                                ForEach(Array(layout.rows.enumerated()), id: \.offset) { _, row in
                                    HStack(alignment: .top, spacing: columnSpacing) {
                                        ForEach(row) { item in
                                            slot(for: item, equalHeight: row.count > 1)
                                        }
                                        if row.count == 1, isHalf(row[0]) {
                                            Color.clear.frame(maxWidth: .infinity)
                                        }
                                    }
                                }
                            }
                        }
                        .padding(.horizontal, 20)
                        .padding(.top, 8)
                        .padding(.bottom, 24)
                        .background(
                            GeometryReader { boardGeo in
                                Color.clear.preference(
                                    key: BoardOriginKey.self,
                                    value: boardGeo.frame(in: .global).origin
                                )
                            }
                        )

                        if hasAccounts,
                           let draggingID,
                           let item = layout.widgets.first(where: { $0.id == draggingID }),
                           dragSourceSize.width > 0 {
                            floatingWidget(item)
                                .frame(
                                    width: dragSourceSize.width,
                                    height: dragSourceSize.height,
                                    alignment: .topLeading
                                )
                                .clipped()
                                .offset(floatingOffset)
                                .zIndex(100)
                                .allowsHitTesting(false)
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .topLeading)
                    .coordinateSpace(name: "board")
                }
                .scrollDisabled(draggingID != nil)
            }
            .harborScreen()
            .harborInlineTitle("Home")
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    if isEditing {
                        Button("Done") { endEditing() }
                            .fontWeight(.semibold)
                            .tint(HarborBrand.accent)
                    } else {
                        HarborHeaderButton(systemImage: "gearshape", accessibilityLabel: "Settings") {
                            navigator.openSettings()
                        }
                    }
                }
                if hasAccounts {
                    ToolbarItem(placement: .topBarTrailing) {
                        if isEditing {
                            Button {
                                showAddSheet = true
                            } label: {
                                Image(systemName: "plus")
                            }
                            .disabled(layout.availableToAdd.isEmpty)
                            .tint(HarborBrand.accent)
                        } else {
                            Button("Edit") {
                                withAnimation(.snappy) { isEditing = true }
                            }
                            .tint(HarborBrand.accent)
                        }
                    }
                }
            }
            .sheet(isPresented: $showAddSheet) {
                AddWidgetSheet(layout: layout)
            }
            .sheet(isPresented: $showConnect) {
                ConnectAccountView()
            }
            .onPreferenceChange(WidgetFrameKey.self) { widgetFrames = $0 }
            .onPreferenceChange(BoardOriginKey.self) { boardOrigin = $0 }
        }
    }

    private func isHalf(_ item: DashboardWidgetItem) -> Bool {
        item.width == .half && item.kind.allowsHalfWidth
    }

    private func endEditing() {
        withAnimation(.snappy) {
            isEditing = false
            clearDragState()
        }
    }

    private func clearDragState() {
        draggingID = nil
        dragTranslation = .zero
        dragSourceSize = .zero
        dragStartFrameOrigin = .zero
        lastTargetIndex = nil
    }

    /// Keep the floating tile locked to the finger's grab point inside the board ZStack.
    private var floatingOffset: CGSize {
        CGSize(
            width: dragStartFrameOrigin.x + dragTranslation.width - boardOrigin.x,
            height: dragStartFrameOrigin.y + dragTranslation.height - boardOrigin.y
        )
    }

    private var connectAccountsPrompt: some View {
        VStack(spacing: 20) {
            HarborMark(size: 40)
            Text(HarborBrand.name)
                .font(.title2.weight(.medium))
                .foregroundStyle(.white)
            Text(HarborBrand.tagline)
                .font(.subheadline)
                .foregroundStyle(HarborSurface.labelMuted)
            Text("Connect a bank with Plaid to see balances, spending, and cash flow.")
                .font(.subheadline)
                .foregroundStyle(HarborSurface.labelMuted)
                .multilineTextAlignment(.center)
            Button("Connect Account") {
                showConnect = true
            }
            .buttonStyle(.borderedProminent)
            .tint(HarborBrand.accent)
            .padding(.top, 4)
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 80)
        .padding(.horizontal, 12)
    }

    private var emptyBoard: some View {
        VStack(spacing: 16) {
            Image(systemName: "square.grid.2x2")
                .font(.system(size: 36, weight: .light))
                .foregroundStyle(HarborSurface.labelMuted)
            Text("Your home screen is empty")
                .font(.title3.weight(.medium))
                .foregroundStyle(.white)
            Text("Add widgets for net worth, accounts, spending, and more.")
                .font(.subheadline)
                .foregroundStyle(HarborSurface.labelMuted)
                .multilineTextAlignment(.center)
            Button("Add Widget") {
                isEditing = true
                showAddSheet = true
            }
            .buttonStyle(.borderedProminent)
            .tint(HarborBrand.accent)
            .padding(.top, 4)
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 80)
        .padding(.horizontal, 12)
    }

    @ViewBuilder
    private func slot(for item: DashboardWidgetItem, equalHeight: Bool = false) -> some View {
        let isDragged = draggingID == item.id

        ZStack(alignment: .topLeading) {
            VStack(alignment: .leading, spacing: 8) {
                if item.showsTitle {
                    Text(item.kind.title)
                        .font(.subheadline.weight(.medium))
                        .foregroundStyle(HarborSurface.labelSecondary)
                        .padding(.horizontal, 2)
                }

                DashboardWidgetContainer(
                    kind: item.kind,
                    width: item.width,
                    navigationEnabled: !isEditing
                )
                    .frame(maxHeight: equalHeight ? .infinity : nil, alignment: .top)
            }
            .frame(maxWidth: .infinity, maxHeight: equalHeight ? .infinity : nil, alignment: .topLeading)
            .opacity(isDragged ? 0.22 : 1)
            .jiggle(jiggleActive, seed: item.id.hashValue)
            .contentShape(RoundedRectangle(cornerRadius: HarborTheme.cardCorner, style: .continuous))
            .gesture(isEditing ? reorderGesture(for: item) : nil)

            removeControl(for: item)

            if item.kind.allowsResize {
                resizeControl(for: item)
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomTrailing)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: equalHeight ? .infinity : nil, alignment: .topLeading)
        .transition(.opacity)
        .background(
            GeometryReader { geo in
                Color.clear.preference(
                    key: WidgetFrameKey.self,
                    value: [item.id: geo.frame(in: .global)]
                )
            }
        )
    }

    private func removeControl(for item: DashboardWidgetItem) -> some View {
        let glyph = ZStack {
            Circle()
                .fill(.ultraThinMaterial)
                .overlay {
                    Circle()
                        .fill(Color.white.opacity(0.14))
                }
                .overlay {
                    Circle()
                        .strokeBorder(Color.white.opacity(0.22), lineWidth: 0.5)
                }
                .frame(width: 24, height: 24)

            Capsule()
                .fill(Color.white.opacity(0.92))
                .frame(width: 10, height: 2.5)
        }
        .shadow(color: .black.opacity(0.35), radius: 3, y: 1)

        return glyph
            .frame(width: 44, height: 44)
            .contentShape(Rectangle())
            .highPriorityGesture(
                TapGesture().onEnded {
                    if draggingID != nil {
                        layout.endDrag()
                        clearDragState()
                    }
                    removeWidget(id: item.id)
                }
            )
            .offset(x: -18, y: -18)
            .opacity(isEditing ? 1 : 0)
            .scaleEffect(isEditing ? 1 : 0.5)
            .allowsHitTesting(isEditing && draggingID == nil)
            .accessibilityHidden(!isEditing)
            .accessibilityAddTraits(.isButton)
            .accessibilityLabel("Remove \(item.kind.title)")
            .zIndex(20)
    }

    private func resizeControl(for item: DashboardWidgetItem) -> some View {
        Button {
            resizeWidget(item)
        } label: {
            RoundedRectangle(cornerRadius: 7, style: .continuous)
                .fill(.ultraThinMaterial)
                .overlay {
                    RoundedRectangle(cornerRadius: 7, style: .continuous)
                        .fill(Color.white.opacity(0.16))
                }
                .overlay {
                    RoundedRectangle(cornerRadius: 7, style: .continuous)
                        .strokeBorder(Color.white.opacity(0.28), lineWidth: 0.5)
                }
                .frame(width: 36, height: 14)
                .shadow(color: .black.opacity(0.3), radius: 3, y: 1)
                .padding(10)
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .opacity(isEditing ? 1 : 0)
        .allowsHitTesting(isEditing && draggingID == nil)
        .accessibilityHidden(!isEditing)
        .accessibilityLabel(item.width == .half ? "Expand to full width" : "Shrink to half width")
        .offset(x: 4, y: 4)
        .zIndex(3)
    }

    private func resizeWidget(_ item: DashboardWidgetItem) {
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
        withAnimation(.snappy(duration: 0.28)) {
            layout.toggleWidth(id: item.id)
        }
    }

    private func removeWidget(id: UUID) {
        withAnimation(.snappy(duration: 0.22)) {
            layout.remove(id: id)
        }
    }

    private func floatingWidget(_ item: DashboardWidgetItem) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            if item.showsTitle {
                Text(item.kind.title)
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(HarborSurface.labelSecondary)
            }
            DashboardWidgetContainer(kind: item.kind, width: item.width, navigationEnabled: false)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .scaleEffect(1.03)
        .shadow(color: .black.opacity(0.45), radius: 18, y: 10)
        .opacity(0.96)
    }

    private func reorderGesture(for item: DashboardWidgetItem) -> some Gesture {
        LongPressGesture(minimumDuration: 0.22)
            .sequenced(before: DragGesture(minimumDistance: 4, coordinateSpace: .global))
            .onChanged { value in
                switch value {
                case .second(true, let drag?):
                    if draggingID == nil {
                        guard let frame = widgetFrames[item.id], frame.width > 0, frame.height > 0 else { return }
                        draggingID = item.id
                        dragStartFrameOrigin = frame.origin
                        dragSourceSize = frame.size
                        dragTranslation = .zero
                        lastTargetIndex = layout.widgets.firstIndex(where: { $0.id == item.id })
                        layout.beginDrag()
                        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                    }
                    guard draggingID == item.id else { return }
                    dragTranslation = drag.translation

                    let finger = drag.location
                    if let targetIndex = insertionIndex(for: finger, excluding: item.id) {
                        lastTargetIndex = targetIndex
                    }
                default:
                    break
                }
            }
            .onEnded { _ in
                let dropIndex = lastTargetIndex
                let movedID = draggingID
                if let movedID, let dropIndex {
                    withAnimation(.snappy(duration: 0.28)) {
                        layout.relocate(id: movedID, toIndex: dropIndex)
                    }
                }
                layout.endDrag()
                withAnimation(.snappy(duration: 0.2)) {
                    clearDragState()
                }
            }
    }

    private func insertionIndex(for point: CGPoint, excluding draggedID: UUID) -> Int? {
        let others = layout.widgets.enumerated().compactMap { index, widget -> (Int, CGRect)? in
            guard widget.id != draggedID, let frame = widgetFrames[widget.id] else { return nil }
            return (index, frame)
        }
        guard !others.isEmpty else { return layout.widgets.count - 1 }

        if let hit = others.first(where: { $0.1.contains(point) }) {
            let midX = hit.1.midX
            return point.x > midX ? hit.0 + 1 : hit.0
        }

        let sortedByY = others.sorted { $0.1.midY < $1.1.midY }
        if let first = sortedByY.first, point.y < first.1.minY {
            return first.0
        }
        if let last = sortedByY.last, point.y > last.1.maxY {
            return last.0 + 1
        }

        var bestIndex = 0
        var bestDistance = CGFloat.greatestFiniteMagnitude
        for (index, frame) in others {
            let dx = point.x - frame.midX
            let dy = point.y - frame.midY
            let distance = dx * dx + dy * dy
            if distance < bestDistance {
                bestDistance = distance
                bestIndex = point.y > frame.midY ? index + 1 : index
            }
        }
        return bestIndex
    }
}

// MARK: - Jiggle

private extension View {
    func jiggle(_ active: Bool, seed: Int) -> some View {
        modifier(JiggleModifier(active: active, seed: seed))
    }
}

private struct JiggleModifier: ViewModifier {
    let active: Bool
    let seed: Int
    @State private var phase = false

    func body(content: Content) -> some View {
        content
            .rotationEffect(.degrees(active ? (phase ? 0.75 : -0.75) * (seed.isMultiple(of: 2) ? 1 : -1) : 0))
            .animation(
                active
                    ? .easeInOut(duration: 0.18 + Double(abs(seed % 5)) * 0.012).repeatForever(autoreverses: true)
                    : .easeOut(duration: 0.15),
                value: phase
            )
            .onAppear { phase = active }
            .onChange(of: active) { _, newValue in
                withAnimation(newValue ? nil : .easeOut(duration: 0.15)) {
                    phase = newValue
                }
                if newValue {
                    DispatchQueue.main.async {
                        phase = true
                    }
                }
            }
    }
}

// MARK: - Preference keys

private struct WidgetFrameKey: PreferenceKey {
    static var defaultValue: [UUID: CGRect] = [:]
    static func reduce(value: inout [UUID: CGRect], nextValue: () -> [UUID: CGRect]) {
        value.merge(nextValue(), uniquingKeysWith: { $1 })
    }
}

private struct BoardOriginKey: PreferenceKey {
    static var defaultValue: CGPoint = .zero
    static func reduce(value: inout CGPoint, nextValue: () -> CGPoint) {
        value = nextValue()
    }
}

// MARK: - Add sheet

private struct AddWidgetSheet: View {
    @Bindable var layout: DashboardLayoutStore
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            List {
                if layout.availableToAdd.isEmpty {
                    Text("Every widget is already on your home screen.")
                        .foregroundStyle(HarborSurface.labelMuted)
                        .listRowBackground(HarborSurface.elevated)
                } else {
                    ForEach(layout.availableToAdd) { kind in
                        Button {
                            layout.add(kind)
                            dismiss()
                        } label: {
                            HStack(spacing: 14) {
                                Image(systemName: kind.systemImage)
                                    .font(.body.weight(.light))
                                    .foregroundStyle(HarborBrand.accent)
                                    .frame(width: 28)
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(kind.title)
                                        .foregroundStyle(.white)
                                    Text(kind.detail)
                                        .font(.caption)
                                        .foregroundStyle(HarborSurface.labelMuted)
                                }
                                Spacer()
                                Image(systemName: "plus.circle.fill")
                                    .foregroundStyle(HarborBrand.accent)
                            }
                        }
                        .listRowBackground(HarborSurface.elevated)
                    }
                }
            }
            .scrollContentBackground(.hidden)
            .background(HarborSurface.canvas)
            .navigationTitle("Add Widget")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                        .tint(HarborBrand.accent)
                }
            }
            .toolbarBackground(HarborSurface.canvas, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
        }
        .presentationDetents([.medium, .large])
    }
}
