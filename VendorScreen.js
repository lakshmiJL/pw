import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert 
} from 'react-native';
import { db } from '../firebaseConfig';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  updateDoc, 
  orderBy 
} from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

const VendorScreen = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!currentUser) return;

    // Real-time listener for orders assigned to this vendor
    const ordersRef = collection(db, 'orders');
    const q = query(
      ordersRef, 
      where('vendorId', '==', currentUser.uid),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setOrders(ordersData);
      setLoading(false);
    }, (error) => {
      console.error("Order Subscription Error: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, { status: newStatus });
      Alert.alert("Success", `Order marked as ${newStatus}`);
    } catch (error) {
      Alert.alert("Error", "Could not update order status.");
    }
  };

  const renderOrderItem = ({ item }) => (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <Text style={styles.orderId}>Order #{item.id.slice(-5).toUpperCase()}</Text>
        <Text style={[styles.statusBadge, styles[item.status]]}>
          {item.status.toUpperCase()}
        </Text>
      </View>

      <FlatList
        data={item.items}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => (
          <Text style={styles.itemText}>{item.quantity}x {item.name}</Text>
        )}
      />

      <Text style={styles.totalText}>Total: ₹{item.total}</Text>

      <View style={styles.actionRow}>
        {item.status === 'placed' && (
          <TouchableOpacity 
            style={[styles.button, styles.acceptBtn]} 
            onPress={() => updateOrderStatus(item.id, 'accepted')}
          >
            <Text style={styles.buttonText}>Accept Order</Text>
          </TouchableOpacity>
        )}
        
        {item.status === 'accepted' && (
          <TouchableOpacity 
            style={[styles.button, styles.readyBtn]} 
            onPress={() => updateOrderStatus(item.id, 'ready')}
          >
            <Text style={styles.buttonText}>Mark Ready</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  if (loading) {
    return <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Incoming Orders</Text>
      {orders.length === 0 ? (
        <Text style={styles.emptyText}>No active orders at the moment.</Text>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          renderItem={renderOrderItem}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
};

export default VendorScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa', padding: 15 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 15, color: '#333' },
  loader: { flex: 1, justifyContent: 'center' },
  listContent: { paddingBottom: 20 },
  orderCard: { 
    backgroundColor: '#fff', 
    padding: 15, 
    borderRadius: 12, 
    marginBottom: 15, 
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5
  },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  orderId: { fontWeight: 'bold', color: '#555' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 5, fontSize: 12, fontWeight: 'bold', color: '#fff' },
  placed: { backgroundColor: '#f39c12' },
  accepted: { backgroundColor: '#3498db' },
  ready: { backgroundColor: '#2ecc71' },
  itemText: { fontSize: 16, color: '#444', marginVertical: 2 },
  totalText: { fontSize: 18, fontWeight: 'bold', marginTop: 10, textAlign: 'right', color: '#000' },
  actionRow: { flexDirection: 'row', marginTop: 15, justifyContent: 'flex-end' },
  button: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  acceptBtn: { backgroundColor: '#007AFF' },
  readyBtn: { backgroundColor: '#2ecc71' },
  buttonText: { color: '#fff', fontWeight: 'bold' },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#999', fontSize: 16 }
});
