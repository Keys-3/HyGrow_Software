import SafeImage from '../../../src/components/SafeImage';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Modal, TextInput, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import useOrders from '../../../src/hooks/useOrders';
import useAppStore from '../../../src/store/useAppStore';
import { useThemeColors, spacing, borderRadius, typography } from '../../../src/theme/theme';
import { formatDate, formatTime, getDefaultImage } from '../../../src/utils/helpers';
import CustomAlert from '../../../src/components/CustomAlert';
import { FALLBACK_SAMPLE_ORDERS } from '../../../src/utils/fallbackMarket';

type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'out_for_delivery' | 'delivered' | 'cancelled' | 'returned';

const getStatusConfig = (colors: any): Record<OrderStatus, { color: string; label: string; description: string }> => ({
  pending: { color: colors.warning, label: 'Pending', description: 'Order placed, awaiting confirmation' },
  confirmed: { color: colors.info, label: 'Confirmed', description: 'Order confirmed by seller' },
  processing: { color: colors.primary, label: 'Processing', description: 'Order is being prepared' },
  out_for_delivery: { color: colors.info, label: 'Out for Delivery', description: 'Order is out for delivery' },
  delivered: { color: colors.success, label: 'Delivered', description: 'Order delivered successfully' },
  cancelled: { color: colors.danger, label: 'Cancelled', description: 'Order has been cancelled' },
  returned: { color: colors.warning, label: 'Returned', description: 'Item has been returned' },
});

const STATUS_FLOW: OrderStatus[] = ['pending', 'confirmed', 'processing', 'out_for_delivery', 'delivered'];

export default function OrderDetailScreen() {
  const { orderId } = useLocalSearchParams();
  const router = useRouter();
  const themeColors = useThemeColors();
  const styles = createStyles(themeColors);
  const { orders, loading: ordersLoading, cancelOrder, updateOrderStatus, deleteOrder } = useOrders();
  const user = useAppStore((state) => state.user);
  const [updating, setUpdating] = useState(false);
  const [customAlert, setCustomAlert] = useState({ visible: false, title: '', message: '', buttons: [] as any });
  
  // Tracking Modal State
  const [trackingModalVisible, setTrackingModalVisible] = useState(false);
  const [trackingLocation, setTrackingLocation] = useState('');
  const [trackingNotes, setTrackingNotes] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus>('pending');
  const [isSimulating, setIsSimulating] = useState(false);

  const order = orders.find(o => o.id === orderId) || (FALLBACK_SAMPLE_ORDERS.find(o => o.id === orderId) as any);

  if (ordersLoading && !order) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={themeColors.primary} style={{ marginTop: 100 }} />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorEmoji}>😕</Text>
          <Text style={styles.errorTitle}>Order not found</Text>
          <Text style={styles.errorSubtitle}>This order may have been removed or does not exist</Text>
          <Pressable style={styles.errorBackBtn} onPress={() => router.back()}>
            <Text style={styles.errorBackBtnText}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const statusConfig = getStatusConfig(themeColors)[order.status as OrderStatus] || getStatusConfig(themeColors).pending;
  const currentStepIndex = STATUS_FLOW.indexOf(order.status as OrderStatus);
  const isCustomer = user?.role === 'customer';
  const isSeller = order.items?.some((item: any) => item.seller_id === user?.id);
  const isAdmin = user?.role === 'admin';
  const canCancel = (isCustomer || isSeller || isAdmin) && (order.status !== 'delivered' && order.status !== 'cancelled' && order.status !== 'returned');
  const canUpdateStatus = (isSeller || isAdmin) && order.status !== 'delivered' && order.status !== 'cancelled' && order.status !== 'returned';
  const canReturn = (isCustomer || isSeller || isAdmin) && order.status === 'delivered';
  const canDelete = (order.status === 'delivered' || order.status === 'cancelled' || order.status === 'returned') && (isCustomer || isSeller || isAdmin);

  const handleCancel = () => {
    setCustomAlert({
      visible: true,
      title: 'Cancel Order',
      message: 'Are you sure you want to cancel this order? This action cannot be undone.',
      buttons: [
        { text: 'No, Keep Order', style: 'cancel', onPress: () => setCustomAlert((prev: any) => ({ ...prev, visible: false })) },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            setCustomAlert((prev: any) => ({ ...prev, visible: false }));
            try {
              setUpdating(true);
              await cancelOrder(order.id);
              setCustomAlert({
                visible: true,
                title: 'Success',
                message: 'Order has been cancelled',
                buttons: [{ text: 'OK', onPress: () => setCustomAlert((prev: any) => ({ ...prev, visible: false })) }]
              });
            } catch (err: any) {
              setCustomAlert({
                visible: true,
                title: 'Error',
                message: err.message,
                buttons: [{ text: 'OK', onPress: () => setCustomAlert((prev: any) => ({ ...prev, visible: false })) }]
              });
            } finally {
              setUpdating(false);
            }
          }
        }
      ]
    });
  };

  const handleReturn = () => {
    setCustomAlert({
      visible: true,
      title: 'Return Item',
      message: 'Are you sure you want to return this item?',
      buttons: [
        { text: 'No, Keep Item', style: 'cancel', onPress: () => setCustomAlert((prev: any) => ({ ...prev, visible: false })) },
        {
          text: 'Yes, Return',
          style: 'destructive',
          onPress: async () => {
            setCustomAlert((prev: any) => ({ ...prev, visible: false }));
            try {
              setUpdating(true);
              await updateOrderStatus(order.id, 'returned', 'Item returned by user');
              setCustomAlert({
                visible: true,
                title: 'Success',
                message: 'Item has been returned',
                buttons: [{ text: 'OK', onPress: () => setCustomAlert((prev: any) => ({ ...prev, visible: false })) }]
              });
            } catch (err: any) {
              setCustomAlert({
                visible: true,
                title: 'Error',
                message: err.message,
                buttons: [{ text: 'OK', onPress: () => setCustomAlert((prev: any) => ({ ...prev, visible: false })) }]
              });
            } finally {
              setUpdating(false);
            }
          }
        }
      ]
    });
  };

  const openUpdateModal = () => {
    const nextStatus = STATUS_FLOW[currentStepIndex + 1] || STATUS_FLOW[STATUS_FLOW.length - 1];
    setSelectedStatus(nextStatus);
    setTrackingLocation('');
    setTrackingNotes('');
    setTrackingModalVisible(true);
  };

  const submitTrackingUpdate = async () => {
    try {
      setUpdating(true);
      setTrackingModalVisible(false);
      await updateOrderStatus(order.id, selectedStatus, trackingNotes, trackingLocation);
      setCustomAlert({
        visible: true,
        title: 'Success',
        message: `Order updated successfully`,
        buttons: [{ text: 'OK', onPress: () => setCustomAlert((prev: any) => ({ ...prev, visible: false })) }]
      });
    } catch (err: any) {
      setCustomAlert({
        visible: true,
        title: 'Error',
        message: err.message,
        buttons: [{ text: 'OK', onPress: () => setCustomAlert((prev: any) => ({ ...prev, visible: false })) }]
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = () => {
    setCustomAlert({
      visible: true,
      title: 'Delete Order History',
      message: 'Are you sure you want to permanently delete this order history? This action cannot be undone.',
      buttons: [
        { text: 'No, Keep Order', style: 'cancel', onPress: () => setCustomAlert((prev: any) => ({ ...prev, visible: false })) },
        {
          text: 'Yes, Delete',
          style: 'destructive',
          onPress: async () => {
            setCustomAlert((prev: any) => ({ ...prev, visible: false }));
            try {
              setUpdating(true);
              await deleteOrder(order.id);
              router.back();
            } catch (err: any) {
              setCustomAlert({
                visible: true,
                title: 'Error',
                message: err.message,
                buttons: [{ text: 'OK', onPress: () => setCustomAlert((prev: any) => ({ ...prev, visible: false })) }]
              });
            } finally {
              setUpdating(false);
            }
          }
        }
      ]
    });
  };

  const simulateProgress = async () => {
    if (isSimulating) return;
    setIsSimulating(true);
    let currentIdx = currentStepIndex;
    
    const simulateStep = async () => {
      if (currentIdx >= STATUS_FLOW.length - 1) {
        setIsSimulating(false);
        return;
      }
      currentIdx++;
      const nextStatus = STATUS_FLOW[currentIdx];
      
      const mockLocations: Record<string, string> = {
        'confirmed': 'Local Facility',
        'processing': 'Warehouse A',
        'out_for_delivery': 'City Distribution Center',
        'delivered': 'Customer Address'
      };
      
      const mockNotes: Record<string, string> = {
        'confirmed': 'Order received and confirmed.',
        'processing': 'Items are being picked and packed.',
        'out_for_delivery': 'Package is out for delivery in your area.',
        'delivered': 'Package delivered.'
      };

      try {
        await updateOrderStatus(order.id, nextStatus, mockNotes[nextStatus], mockLocations[nextStatus]);
        setTimeout(simulateStep, 3000); // Wait 3 seconds before next step
      } catch (err) {
        console.error(err);
        setIsSimulating(false);
      }
    };
    
    simulateStep();
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Order #{order.id.slice(0, 8).toUpperCase()}</Text>
          <Text style={styles.date}>{formatDate(order.created_at)} at {formatTime(order.created_at)}</Text>
        </View>

        {/* Status Progress */}
        <View style={styles.progressCard}>
          <Text style={styles.sectionTitle}>Order Status</Text>
          <View style={styles.statusRow}>
            <View style={[styles.currentStatusBadge, { backgroundColor: statusConfig.color + '20' }]}>
              <Text style={[styles.currentStatusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
            </View>
            <Text style={styles.statusDescription}>{statusConfig.description}</Text>
          </View>

          {/* Progress Steps */}
          <View style={styles.progressSteps}>
            {STATUS_FLOW.map((status, index) => {
              const config = getStatusConfig(themeColors)[status];
              const isCompleted = index <= currentStepIndex;
              const isCurrent = index === currentStepIndex;

              return (
                <View key={status} style={styles.stepContainer}>
                  <View style={[styles.stepDot, isCompleted && { backgroundColor: config.color }]}>
                    {isCompleted ? (
                      <Text style={styles.stepCheck}>✓</Text>
                    ) : (
                      <View style={styles.stepDotEmpty} />
                    )}
                  </View>
                  <Text style={[styles.stepLabel, isCurrent && styles.stepLabelActive]}>{config.label}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Items */}
        <View style={styles.itemsCard}>
          <Text style={styles.sectionTitle}>Items ({order.items?.length || 0})</Text>
          {order.items?.map((item: any, i: number) => {
            const itemImg = item.image_url || getDefaultImage(item.category || '', item.product_name);
            return (
              <View key={i} style={styles.itemRow}>
                <SafeImage source={{ uri: itemImg }} style={styles.itemThumb} resizeMode="cover" />
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.product_name}</Text>
                  <Text style={styles.itemQty}>Quantity: {item.quantity} {item.unit?.replace('per ', '') || 'unit'}</Text>
                </View>
                <Text style={styles.itemPrice}>₹{item.total_price.toFixed(2)}</Text>
              </View>
            );
          })}
          <View style={styles.divider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalAmount}>₹{order.total_amount.toFixed(2)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Payment Method</Text>
            <Text style={styles.paymentMethod}>
              {order.payment_method === 'ONLINE' ? `💳 Razorpay (${order.transaction_id || 'Captured'})` : order.payment_method === 'UPI' ? `📱 UPI UTR: ${order.transaction_id || 'Pending'}` : '💵 Cash on Delivery'}
            </Text>
          </View>
        </View>

        {/* Shipping Address */}
        {order.shipping_address && (
          <View style={styles.addressCard}>
            <Text style={styles.sectionTitle}>Shipping Address</Text>
            <Text style={styles.addressText}>{order.shipping_address}</Text>
            {order.shipping_city && (
              <Text style={styles.addressText}>{order.shipping_city}, {order.shipping_state} - {order.shipping_pincode}</Text>
            )}
          </View>
        )}

        {/* Tracking History */}
        {order.tracking && order.tracking.length > 0 && (
          <View style={styles.trackingCard}>
            <Text style={styles.sectionTitle}>Tracking History</Text>
            {[...order.tracking].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((track: any, i: number) => {
              const trackConfig = getStatusConfig(themeColors)[track.status as OrderStatus] || getStatusConfig(themeColors).pending;
              return (
                <View key={i} style={styles.trackItem}>
                  <View style={[styles.trackDot, { backgroundColor: trackConfig.color }]} />
                  <View style={styles.trackContent}>
                    <Text style={styles.trackStatus}>{trackConfig.label}</Text>
                    {track.location && <Text style={styles.trackLocation}>📍 {track.location}</Text>}
                    {track.notes && <Text style={styles.trackNotes}>{track.notes}</Text>}
                    <Text style={styles.trackTime}>{formatDate(track.created_at)} {formatTime(track.created_at)}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Actions */}
        {canCancel && (
          <Pressable style={[styles.actionBtn, styles.cancelBtn]} onPress={handleCancel} disabled={updating || isSimulating}>
            {updating ? <ActivityIndicator color={themeColors.danger} /> : (
              <Text style={styles.cancelBtnText}>Cancel Order</Text>
            )}
          </Pressable>
        )}

        {canReturn && (
          <Pressable style={[styles.actionBtn, styles.returnBtn]} onPress={handleReturn} disabled={updating || isSimulating}>
            {updating ? <ActivityIndicator color={themeColors.warning} /> : (
              <Text style={styles.returnBtnText}>Return Item</Text>
            )}
          </Pressable>
        )}

        {canUpdateStatus && (
          <Pressable style={[styles.actionBtn, styles.updateBtn]} onPress={openUpdateModal} disabled={updating || isSimulating}>
            {updating ? <ActivityIndicator color={themeColors.background} /> : (
              <Text style={styles.updateBtnText}>Update Tracking</Text>
            )}
          </Pressable>
        )}

        {canUpdateStatus && (
          <Pressable style={[styles.actionBtn, styles.simulateBtn]} onPress={simulateProgress} disabled={updating || isSimulating}>
            {isSimulating ? <ActivityIndicator color={themeColors.primary} /> : (
              <Text style={styles.simulateBtnText}>Simulate Auto-Track</Text>
            )}
          </Pressable>
        )}

        {canDelete && (
          <Pressable style={[styles.actionBtn, styles.deleteBtn]} onPress={handleDelete} disabled={updating || isSimulating}>
            {updating ? <ActivityIndicator color={themeColors.danger} /> : (
              <Text style={styles.deleteBtnText}>Delete Order History</Text>
            )}
          </Pressable>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Manual Tracking Modal */}
      <Modal
        visible={trackingModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setTrackingModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Update Order Tracking</Text>
            
            <Text style={styles.inputLabel}>Status</Text>
            <View style={styles.statusChips}>
              {STATUS_FLOW.map(status => (
                <Pressable 
                  key={status}
                  style={[
                    styles.statusChip, 
                    selectedStatus === status && { backgroundColor: themeColors.primary, borderColor: themeColors.primary }
                  ]}
                  onPress={() => setSelectedStatus(status)}
                >
                  <Text style={[
                    styles.statusChipText,
                    selectedStatus === status && { color: themeColors.background }
                  ]}>{getStatusConfig(themeColors)[status].label}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.inputLabel}>Current Location (Optional)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Warehouse A"
              placeholderTextColor={themeColors.textSecondary}
              value={trackingLocation}
              onChangeText={setTrackingLocation}
            />

            <Text style={styles.inputLabel}>Notes (Optional)</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="e.g. Package is ready for dispatch"
              placeholderTextColor={themeColors.textSecondary}
              value={trackingNotes}
              onChangeText={setTrackingNotes}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancelBtn} onPress={() => setTrackingModalVisible(false)}>
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.modalSubmitBtn} onPress={submitTrackingUpdate}>
                <Text style={styles.modalSubmitBtnText}>Save Update</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <CustomAlert 
        visible={customAlert.visible}
        title={customAlert.title}
        message={customAlert.message}
        buttons={customAlert.buttons}
        onDismiss={() => setCustomAlert((prev: any) => ({ ...prev, visible: false }))}
      />
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingTop: 60,
    paddingBottom: 40,
    width: '100%',
    maxWidth: 1120,
    alignSelf: 'center',
  },
  backBtn: {
    marginBottom: spacing.md,
  },
  backText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  header: {
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h1,
    color: colors.text,
  },
  date: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: 4,
  },
  sectionTitle: {
    ...typography.h3,
    marginBottom: spacing.md,
    color: colors.text,
  },
  progressCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  currentStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
  },
  currentStatusText: {
    ...typography.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  statusDescription: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    flex: 1,
  },
  progressSteps: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stepContainer: {
    alignItems: 'center',
    flex: 1,
  },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  stepCheck: {
    color: colors.success,
    fontWeight: '700',
    fontSize: 15,
  },
  stepDotEmpty: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surfaceLight,
  },
  stepLabel: {
    ...typography.caption,
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 12,
  },
  stepLabelActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  itemsCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  itemThumb: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    marginRight: spacing.md,
    backgroundColor: colors.surfaceLight,
  },
  itemInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  itemName: {
    ...typography.body,
    fontWeight: '500',
    marginBottom: 2,
    color: colors.text,
  },
  itemQty: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  itemPrice: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  totalAmount: {
    ...typography.h2,
    color: colors.primary,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  paymentLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  paymentMethod: {
    ...typography.body,
    fontWeight: '500',
    color: colors.text,
  },
  addressCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addressText: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  trackingCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  trackItem: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  trackDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing.md,
    marginTop: 3,
  },
  trackContent: {
    flex: 1,
  },
  trackStatus: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: 2,
    color: colors.text,
  },
  trackLocation: {
    ...typography.bodySmall,
    color: colors.primary,
    marginBottom: 2,
    fontWeight: '500',
  },
  trackNotes: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  trackTime: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  actionBtn: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  cancelBtn: {
    backgroundColor: colors.danger + '20',
    borderWidth: 1,
    borderColor: colors.danger + '40',
  },
  cancelBtnText: {
    ...typography.body,
    color: colors.danger,
    fontWeight: '600',
  },
  returnBtn: {
    backgroundColor: colors.warning + '20',
    borderWidth: 1,
    borderColor: colors.warning + '40',
  },
  returnBtnText: {
    ...typography.body,
    color: colors.warning,
    fontWeight: '600',
  },
  updateBtn: {
    backgroundColor: colors.action,
  },
  updateBtnText: {
    ...typography.body,
    color: colors.actionText,
    fontWeight: '600',
  },
  simulateBtn: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  simulateBtnText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  deleteBtn: {
    backgroundColor: colors.danger + '10',
    borderWidth: 1,
    borderColor: colors.danger + '40',
  },
  deleteBtnText: {
    ...typography.body,
    color: colors.danger,
    fontWeight: '600',
  },
  errorContainer: {
    alignItems: 'center',
    padding: spacing.xxl,
  },
  errorEmoji: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  errorTitle: {
    ...typography.h2,
    marginBottom: spacing.sm,
    color: colors.text,
  },
  errorSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  errorBackBtn: {
    backgroundColor: colors.action,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  errorBackBtnText: {
    ...typography.body,
    color: colors.actionText,
    fontWeight: '600',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    paddingBottom: spacing.lg,
    ...Platform.select({
      web: {
        boxShadow: '0 -2px 10px rgba(0,0,0,0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
      },
    }),
  },
  modalTitle: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  inputLabel: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  textInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: colors.text,
    ...typography.body,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  statusChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  statusChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  statusChipText: {
    ...typography.bodySmall,
    color: colors.text,
    fontWeight: '500',
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  modalCancelBtn: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  modalCancelBtnText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  modalSubmitBtn: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.action,
    alignItems: 'center',
  },
  modalSubmitBtnText: {
    ...typography.body,
    color: colors.actionText,
    fontWeight: '600',
  },
});
