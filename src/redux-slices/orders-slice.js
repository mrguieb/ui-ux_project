import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

export const punchOrderNumber = createAsyncThunk(
    'orders/punchOrderNumber',
    async (s, { getState }) => {
        const oldOrderNumber = getState().orders.orderNumber;

        const newOrderNumber = oldOrderNumber + 1;
        const orderNumber = { orderNumber: newOrderNumber };

        try {
            await axios.post(
                'https://e-cignition-ecommerce-store-default-rtdb.firebaseio.com/orderNumber.json',
                orderNumber
            );
            return newOrderNumber;  // Return the updated order number
        } catch (err) {
            console.error('Failed to update order number', err);
            throw err;  // Optionally throw the error for further handling
        }
    }
);

export const getOrderNumber = createAsyncThunk(
    'orders/getOrderNumber',
    async () => {
        try {
            const response = await axios.get(
                'https://e-cignition-ecommerce-store-default-rtdb.firebaseio.com/orderNumber.json'
            );
            return response.data;
        } catch (err) {
            console.error('Failed to fetch order number', err);
            throw err;
        }
    }
);

export const createOrder = createAsyncThunk(
    'orders/createOrder',
    async (order) => {
        try {
            await axios.post(
                'https://e-cignition-ecommerce-store-default-rtdb.firebaseio.com/orders.json',
                order
            );
        } catch (err) {
            console.error('Failed to create order', err);
            throw err;
        }
    }
);

export const fetchOrders = createAsyncThunk(
    'orders/fetchOrders',
    async (email, { getState }) => {
        let url = `https://e-cignition-ecommerce-store-default-rtdb.firebaseio.com/orders.json?orderBy="email"&equalTo="${email}"`;
        if (getState().auth.isAdmin) {
            url = `https://e-cignition-ecommerce-store-default-rtdb.firebaseio.com/orders.json`;
        }
        try {
            const response = await axios.get(url);
            return response.data;
        } catch (err) {
            console.error('Failed to fetch orders', err);
            throw err;
        }
    }
);

export const updateDeliveryStatus = createAsyncThunk(
    'orders/updateDeliveryStatus',
    async ({ orderId, status }, { getState }) => {
        const state = getState();
        const idToken = state.auth.user?.idToken; // Make sure you have the user's ID token
        if (!idToken) {
            throw new Error('User is not authenticated.');
        }

        try {
            console.log(`Updating delivery status for orderId: ${orderId} to ${status}`);
            const response = await axios.patch(
                `https://e-cignition-ecommerce-store-default-rtdb.firebaseio.com/orders/${orderId}.json?auth=${idToken}`,
                { deliveryStatus: status }
            );
            
            console.log('Response from Firebase:', response);

            return { orderId, status };
        } catch (err) {
            console.error('Failed to update delivery status', err);
            throw err;
        }
    }
);



const initialState = {
    orders: [],
    isLoading: false,
    orderNumber: 100,
};

const ordersSlice = createSlice({
    name: 'orders',
    initialState,
    reducers: {
        removeAllOrders: (state) => {
            state.orders = [];
        },
    },

    extraReducers: (builder) => {
        builder
            .addCase(createOrder.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(createOrder.fulfilled, (state) => {
                state.isLoading = false;
            })
            .addCase(createOrder.rejected, (state) => {
                state.isLoading = false;
            })
            .addCase(fetchOrders.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(fetchOrders.fulfilled, (state, action) => {
                state.isLoading = false;
                const ordersArr = Object.values(action.payload);

                for (let item of ordersArr) {
                    let totalQuantity = 0;
                    item.orderedProducts?.forEach((item) => {
                        totalQuantity = totalQuantity + item.quantity;
                    });

                    const order = {
                        orderId: `EC-${item.orderId}`,
                        numberOfProducts: totalQuantity,
                        totalPrice: item.totalPrice,
                        deliveryStatus: item.deliveryStatus || 'pending',
                        contactInfo: item.contactInfo,
                        orderedProducts: item.orderedProducts,
                    };

                    state.orders.push(order);
                }
            })
            .addCase(fetchOrders.rejected, (state) => {
                state.isLoading = false;
            })
            .addCase(getOrderNumber.fulfilled, (state, action) => {
                const orderNumberArr = Object.values(action.payload);
                state.orderNumber = orderNumberArr[orderNumberArr.length - 1].orderNumber;
            })
            .addCase(updateDeliveryStatus.fulfilled, (state, action) => {
                const { orderId, status } = action.payload;
                const orderIndex = state.orders.findIndex(
                    (order) => order.orderId === orderId
                );
                if (orderIndex !== -1) {
                    state.orders[orderIndex].deliveryStatus = status;
                }
            })
            .addCase(punchOrderNumber.fulfilled, (state, action) => {
                state.orderNumber = action.payload;
            });
    },
});

export const { removeAllOrders } = ordersSlice.actions;

export default ordersSlice.reducer;
