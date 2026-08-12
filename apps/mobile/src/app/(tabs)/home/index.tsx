import { SymbolView } from 'expo-symbols';
import * as Haptics from 'expo-haptics';
import { Stack } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { WidgetView } from '@/components/board/widgets';
import {
  moveWidgetToIndex,
  WIDGET_META,
  type DashboardWidgetItem,
} from '@/components/board/layout';
import { GlassChrome } from '@/components/ui/GlassButton';
import { brand, surface, theme, layout } from '@/theme/tokens';
import { useApp } from '@/context/app';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type SlotFrame = { x: number; y: number; width: number; height: number };

const isHalfTile = (item: DashboardWidgetItem) =>
  item.width === 'half' && WIDGET_META[item.kind].allowsHalfWidth;

const animateBoardLayout = () => {
  LayoutAnimation.configureNext({
    duration: 220,
    update: {
      type: LayoutAnimation.Types.easeInEaseOut,
    },
    create: {
      type: LayoutAnimation.Types.easeInEaseOut,
      property: LayoutAnimation.Properties.opacity,
    },
    delete: {
      type: LayoutAnimation.Types.easeInEaseOut,
      property: LayoutAnimation.Properties.opacity,
    },
  });
};

/**
 * Final index (0…n-1) for the dragged widget from finger position — stable for
 * live SpringBoard-style shifting (unlike insert-before indices).
 */
const destinationIndex = (
  pointX: number,
  pointY: number,
  widgets: DashboardWidgetItem[],
  excluding: string,
  frames: Record<string, SlotFrame>
): number => {
  const others = widgets
    .filter((w) => w.id !== excluding)
    .map((w) => ({ id: w.id, frame: frames[w.id] }))
    .filter((o): o is { id: string; frame: SlotFrame } => !!o.frame && o.frame.width > 0);

  if (others.length === 0) return 0;

  const sorted = [...others].sort((a, b) => {
    const ay = a.frame.y + a.frame.height / 2;
    const by = b.frame.y + b.frame.height / 2;
    const rowSlop = Math.min(a.frame.height, b.frame.height) * 0.35;
    if (Math.abs(ay - by) > rowSlop) return ay - by;
    return a.frame.x + a.frame.width / 2 - (b.frame.x + b.frame.width / 2);
  });

  let dest = 0;
  for (const o of sorted) {
    const cx = o.frame.x + o.frame.width / 2;
    const cy = o.frame.y + o.frame.height / 2;
    const sameRow = Math.abs(pointY - cy) <= Math.max(o.frame.height * 0.55, 28);
    if (sameRow) {
      if (pointX > cx) dest += 1;
      else break;
    } else if (pointY > cy) {
      dest += 1;
    } else {
      break;
    }
  }
  return dest;
};

export default function HomeScreen() {
  const app = useApp();
  const insets = useSafeAreaInsets();
  const [isEditing, setIsEditing] = useState(false);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [draggingID, setDraggingID] = useState<string | null>(null);
  const [dragSize, setDragSize] = useState({ width: 0, height: 0 });
  const framesRef = useRef<Record<string, SlotFrame>>({});
  const slotRefs = useRef<Record<string, View | null>>({});
  const boardRef = useRef<View>(null);
  const scrollRef = useRef<ScrollView>(null);
  /** Last applied live-reorder index — skip work when unchanged. */
  const liveIndexRef = useRef<number | null>(null);
  /** Board origin in window space at drag start (for converting absolute finger → local). */
  const boardOriginRef = useRef({ x: 0, y: 0 });
  /** Finger offset inside the widget so the grab point stays under the touch. */
  const grabOffsetRef = useRef({ x: 0, y: 0 });
  /** Sync mirror of draggingID — pan updates must not wait on setState. */
  const draggingIDRef = useRef<string | null>(null);
  const widgetsRef = useRef(app.widgets);
  widgetsRef.current = app.widgets;

  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);

  const endEditing = () => {
    draggingIDRef.current = null;
    liveIndexRef.current = null;
    setDraggingID(null);
    setIsEditing(false);
  };

  const reportSlotFrame = useCallback((id: string, node: View | null) => {
    slotRefs.current[id] = node;
    node?.measureInWindow((x, y, width, height) => {
      if (width > 0 && height > 0) {
        framesRef.current[id] = { x, y, width, height };
      }
    });
  }, []);

  const beginDrag = useCallback(
    (id: string, fingerX: number, fingerY: number) => {
      const slot = slotRefs.current[id];
      const board = boardRef.current;
      if (!slot || !board) return;

      board.measureInWindow((boardX, boardY) => {
        slot.measureInWindow((x, y, width, height) => {
          if (width <= 0 || height <= 0) return;

          framesRef.current[id] = { x, y, width, height };
          boardOriginRef.current = { x: boardX, y: boardY };
          grabOffsetRef.current = { x: fingerX - x, y: fingerY - y };
          dragX.value = x - boardX;
          dragY.value = y - boardY;
          liveIndexRef.current = widgetsRef.current.findIndex((w) => w.id === id);
          draggingIDRef.current = id;
          setDragSize({ width, height });
          setDraggingID(id);
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

          for (const [otherId, node] of Object.entries(slotRefs.current)) {
            if (otherId === id || !node) continue;
            node.measureInWindow((ox, oy, ow, oh) => {
              if (ow > 0 && oh > 0) {
                framesRef.current[otherId] = { x: ox, y: oy, width: ow, height: oh };
              }
            });
          }
        });
      });
    },
    [dragX, dragY]
  );

  const moveDrag = useCallback(
    (absoluteX: number, absoluteY: number) => {
      const id = draggingIDRef.current;
      if (!id) return;

      dragX.value = absoluteX - grabOffsetRef.current.x - boardOriginRef.current.x;
      dragY.value = absoluteY - grabOffsetRef.current.y - boardOriginRef.current.y;

      const widgets = widgetsRef.current;
      const dest = destinationIndex(absoluteX, absoluteY, widgets, id, framesRef.current);
      if (liveIndexRef.current === dest) return;

      const next = moveWidgetToIndex(widgets, id, dest);
      if (next === widgets) {
        liveIndexRef.current = dest;
        return;
      }

      liveIndexRef.current = dest;
      animateBoardLayout();
      app.previewMove(id, dest);
      void Haptics.selectionAsync();
    },
    [app, dragX, dragY]
  );

  const endDrag = useCallback(() => {
    if (draggingIDRef.current != null) {
      app.commitLayout();
    }
    draggingIDRef.current = null;
    liveIndexRef.current = null;
    setDraggingID(null);
  }, [app]);

  const floatingStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: dragX.value }, { translateY: dragY.value }, { scale: 1.03 }],
  }));

  const draggingItem = useMemo(
    () => app.widgets.find((w) => w.id === draggingID) ?? null,
    [app.widgets, draggingID]
  );

  // Extra bottom inset so resize handles on the last row stay reachable above the tab bar.
  const bottomPad = Math.max(insets.bottom, 12) + 96;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: surface.canvas }}>
      <Stack.Toolbar placement="left" tintColor={brand.accent}>
        {isEditing ? (
          <Stack.Toolbar.Button
            accessibilityLabel="Done"
            variant="done"
            tintColor={brand.accent}
            onPress={endEditing}
          >
            Done
          </Stack.Toolbar.Button>
        ) : (
          <Stack.Toolbar.Button
            icon="gearshape"
            accessibilityLabel="Settings"
            tintColor={brand.accent}
            onPress={app.openSettings}
          />
        )}
      </Stack.Toolbar>
      <Stack.Toolbar placement="right" tintColor={brand.accent}>
        {app.hasAccounts ? (
          isEditing ? (
            <Stack.Toolbar.Button
              icon="plus"
              accessibilityLabel="Add widget"
              disabled={app.availableWidgets.length === 0}
              tintColor={brand.accent}
              onPress={() => setShowAddSheet(true)}
            />
          ) : (
            <Stack.Toolbar.Button
              accessibilityLabel="Edit"
              tintColor={brand.accent}
              onPress={() => setIsEditing(true)}
            >
              Edit
            </Stack.Toolbar.Button>
          )
        ) : null}
      </Stack.Toolbar>

      <View ref={boardRef} style={layout.screen}>
        <ScrollView
          ref={scrollRef}
          scrollEnabled={draggingID == null}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={[
            layout.screenPadding,
            {
              gap: theme.boardRowSpacing,
              paddingBottom: bottomPad,
              paddingTop: 12,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {!app.hasAccounts ? (
            <ConnectPrompt onConnect={app.openConnect} />
          ) : app.widgets.length === 0 ? (
            <EmptyBoard
              onAdd={() => {
                setIsEditing(true);
                setShowAddSheet(true);
              }}
            />
          ) : (
            app.widgetRows.map((row) => (
              <View key={row.map((w) => w.id).join('|')} style={styles.row}>
                {row.map((item) => {
                  const half = isHalfTile(item);
                  return (
                    <View
                      key={item.id}
                      ref={(node) => {
                        if (node) {
                          reportSlotFrame(item.id, node);
                        } else {
                          delete slotRefs.current[item.id];
                        }
                      }}
                      onLayout={() => {
                        const node = slotRefs.current[item.id];
                        node?.measureInWindow((x, y, width, height) => {
                          if (width > 0 && height > 0) {
                            framesRef.current[item.id] = { x, y, width, height };
                          }
                        });
                      }}
                      style={[
                        styles.slot,
                        half ? styles.slotHalf : styles.slotFull,
                        draggingID === item.id && { opacity: 0.22 },
                      ]}
                    >
                      <WidgetSlot
                        item={item}
                        equalHeight={row.length > 1}
                        isEditing={isEditing}
                        isDragging={draggingID === item.id}
                        onRemove={() => app.removeDashboardWidget(item.id)}
                        onResize={() => app.toggleDashboardWidth(item.id)}
                        onDragBegin={(ax, ay) => beginDrag(item.id, ax, ay)}
                        onDragUpdate={(ax, ay) => moveDrag(ax, ay)}
                        onDragEnd={endDrag}
                      />
                    </View>
                  );
                })}
                {row.length === 1 && isHalfTile(row[0]) ? (
                  <View style={styles.slotHalf} pointerEvents="none" />
                ) : null}
              </View>
            ))
          )}
        </ScrollView>

        {draggingItem && dragSize.width > 0 ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.floating,
              floatingStyle,
              { width: dragSize.width, height: dragSize.height },
            ]}
          >
            <WidgetView item={draggingItem} navigationEnabled={false} equalHeight />
          </Animated.View>
        ) : null}

        <AddWidgetSheet
          visible={showAddSheet}
          onClose={() => setShowAddSheet(false)}
          available={app.availableWidgets}
          onAdd={(kind) => {
            app.addDashboardWidget(kind);
            setShowAddSheet(false);
          }}
        />
      </View>
    </GestureHandlerRootView>
  );
}

function WidgetSlot({
  item,
  equalHeight,
  isEditing,
  isDragging,
  onRemove,
  onResize,
  onDragBegin,
  onDragUpdate,
  onDragEnd,
}: {
  item: DashboardWidgetItem;
  equalHeight: boolean;
  isEditing: boolean;
  isDragging: boolean;
  onRemove: () => void;
  onResize: () => void;
  onDragBegin: (absoluteX: number, absoluteY: number) => void;
  onDragUpdate: (absoluteX: number, absoluteY: number) => void;
  onDragEnd: () => void;
}) {
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (isEditing && !isDragging) {
      const dir = item.id.length % 2 === 0 ? 1 : -1;
      rotation.value = withRepeat(
        withSequence(
          withTiming(0.75 * dir, { duration: 180 }),
          withTiming(-0.75 * dir, { duration: 180 })
        ),
        -1,
        true
      );
    } else {
      rotation.value = withTiming(0, { duration: 150 });
    }
  }, [isEditing, isDragging, item.id, rotation]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  // Single pan gesture that activates after a long-press.
  // Track with absolute finger coords so we never inherit stale translation.
  const dragGesture = Gesture.Pan()
    .enabled(isEditing)
    .activateAfterLongPress(220)
    .onStart((e) => {
      runOnJS(onDragBegin)(e.absoluteX, e.absoluteY);
    })
    .onUpdate((e) => {
      runOnJS(onDragUpdate)(e.absoluteX, e.absoluteY);
    })
    .onEnd(() => {
      runOnJS(onDragEnd)();
    })
    .onFinalize((_e, success) => {
      if (!success) runOnJS(onDragEnd)();
    });

  return (
    <GestureDetector gesture={dragGesture}>
      <View style={{ flex: equalHeight ? 1 : undefined }}>
        <Animated.View style={animStyle}>
          <WidgetView item={item} navigationEnabled={!isEditing} equalHeight={equalHeight} />
        </Animated.View>

        {isEditing && !isDragging ? (
          <Pressable
            onPress={onRemove}
            style={styles.removeBtn}
            accessibilityLabel={`Remove ${WIDGET_META[item.kind].title}`}
          >
            <GlassChrome>
              <View style={styles.removeBar} />
            </GlassChrome>
          </Pressable>
        ) : null}

        {isEditing && !isDragging && WIDGET_META[item.kind].allowsHalfWidth ? (
          <Pressable
            onPress={onResize}
            style={styles.resizeBtn}
            accessibilityLabel={
              item.width === 'half' ? 'Expand to full width' : 'Shrink to half width'
            }
          >
            <GlassChrome shape="capsule" />
          </Pressable>
        ) : null}
      </View>
    </GestureDetector>
  );
}

function ConnectPrompt({ onConnect }: { onConnect: () => void }) {
  return (
    <View style={styles.prompt}>
      <SymbolView name={'anchor' as any} size={40} tintColor={brand.accent} weight="light" />
      <Text style={styles.promptTitle}>{brand.name}</Text>
      <Text style={styles.promptSub}>{brand.tagline}</Text>
      <Text style={styles.promptBody}>
        Connect a bank with Plaid to see balances, spending, and cash flow.
      </Text>
      <Pressable style={styles.primaryBtn} onPress={onConnect}>
        <Text style={styles.primaryBtnText}>Connect Account</Text>
      </Pressable>
    </View>
  );
}

function EmptyBoard({ onAdd }: { onAdd: () => void }) {
  return (
    <View style={styles.prompt}>
      <SymbolView name="square.grid.2x2" size={36} tintColor={surface.labelMuted} weight="light" />
      <Text style={styles.promptTitle}>Your home screen is empty</Text>
      <Text style={styles.promptBody}>
        Add widgets for net worth, accounts, spending, and more.
      </Text>
      <Pressable style={styles.primaryBtn} onPress={onAdd}>
        <Text style={styles.primaryBtnText}>Add Widget</Text>
      </Pressable>
    </View>
  );
}

function AddWidgetSheet({
  visible,
  onClose,
  available,
  onAdd,
}: {
  visible: boolean;
  onClose: () => void;
  available: ReturnType<typeof useApp>['availableWidgets'];
  onAdd: (kind: (typeof available)[number]) => void;
}) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[layout.screen, { paddingTop: 16 }]}>
        <View style={styles.sheetHeader}>
          <Pressable onPress={onClose}>
            <Text style={styles.toolbarAccent}>Close</Text>
          </Pressable>
          <Text style={styles.navTitle}>Add Widget</Text>
          <View style={{ width: 48 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 8, paddingBottom: 40 }}>
          {available.length === 0 ? (
            <Text style={styles.promptBody}>Every widget is already on your home screen.</Text>
          ) : (
            available.map((kind) => {
              const meta = WIDGET_META[kind];
              return (
                <Pressable key={kind} style={styles.addRow} onPress={() => onAdd(kind)}>
                  <SymbolView
                    name={meta.systemImage as any}
                    size={18}
                    tintColor={brand.accent}
                    weight="light"
                    style={{ width: 28 }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: surface.label, fontSize: 16 }}>{meta.title}</Text>
                    <Text style={{ color: surface.labelMuted, fontSize: 12 }}>{meta.detail}</Text>
                  </View>
                  <SymbolView name="plus.circle.fill" size={22} tintColor={brand.accent} />
                </Pressable>
              );
            })
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  navTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: surface.label,
  },
  toolbarAccent: {
    fontSize: 17,
    fontWeight: '600',
    color: brand.accent,
    minWidth: 48,
  },
  row: {
    flexDirection: 'row',
    gap: theme.boardColumnSpacing,
    alignItems: 'stretch',
    width: '100%',
  },
  slot: {
    position: 'relative',
    overflow: 'hidden',
  },
  /** flexBasis/minWidth 0 — stop chart intrinsic width from blowing half tiles to full row */
  slotHalf: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
  },
  slotFull: {
    width: '100%',
    flexGrow: 0,
    flexShrink: 0,
  },
  floating: {
    position: 'absolute',
    left: 0,
    top: 0,
    zIndex: 50,
    opacity: 0.96,
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  removeBtn: {
    position: 'absolute',
    top: -18,
    left: -18,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  removeBar: {
    width: 10,
    height: 2.5,
    borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  resizeBtn: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    padding: 10,
    zIndex: 3,
  },
  prompt: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 12,
    gap: 12,
  },
  promptTitle: {
    fontSize: 22,
    fontWeight: '500',
    color: surface.label,
    textAlign: 'center',
  },
  promptSub: {
    fontSize: 15,
    color: surface.labelMuted,
    textAlign: 'center',
  },
  promptBody: {
    fontSize: 15,
    color: surface.labelMuted,
    textAlign: 'center',
    lineHeight: 21,
  },
  primaryBtn: {
    marginTop: 8,
    backgroundColor: brand.accent,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  primaryBtnText: {
    color: '#000',
    fontWeight: '600',
    fontSize: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    backgroundColor: surface.elevated,
    borderRadius: theme.cardCorner,
  },
});
