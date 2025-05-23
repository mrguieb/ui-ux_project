import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Header from '../../Header';
import { useDispatch, useSelector } from 'react-redux';
import Spinner from '../../UI/Spinner';
import AdminOrder from './AdminOrder';
import MobileAdminOrder from './MobileAdminOrder';
import { Footer } from '../../../sections';
import { fetchOrders, removeAllOrders, updateDeliveryStatus } from '../../../redux-slices/orders-slice';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const AdminOrders = () => {
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);
    const [searchTerm, setSearchTerm] = useState('');
    const [recentlyUpdated, setRecentlyUpdated] = useState(null);
    const [sortBy, setSortBy] = useState('date');
    const [updatingStatus, setUpdatingStatus] = useState(null);

    const AdminOrders = useSelector((state) => state.orders.orders);
    const isLoading = useSelector((state) => state.orders.isLoading);
    const email = useSelector(state => state.auth.user.email);
    const from = useSelector(state => state.ui.uiColor.from);
    const to = useSelector(state => state.ui.uiColor.to);

    const dispatch = useDispatch();

    useEffect(() => {
        dispatch(fetchOrders(email));
        return () => dispatch(removeAllOrders());
    }, []);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleStatusChange = async (orderId, newStatus) => {
        setUpdatingStatus(orderId);
        try {
            // Dispatch the update action
            await dispatch(updateDeliveryStatus({ orderId, status: newStatus })).unwrap();
            setRecentlyUpdated(orderId);
            toast.success(`Status for ${orderId} updated to ${newStatus}`);
        } catch (err) {
            toast.error('Failed to update status.');
        } finally {
            setUpdatingStatus(null);
            setTimeout(() => setRecentlyUpdated(null), 1000);
        }
    };
    

    const filteredOrders = useMemo(() => {
        const filtered = AdminOrders.filter((order) =>
            order.contactInfo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.orderId.toLowerCase().includes(searchTerm.toLowerCase())
        );

        if (sortBy === 'status') {
            return filtered.sort((a, b) => a.deliveryStatus.localeCompare(b.deliveryStatus));
        }
        return filtered.sort((a, b) => {
            const aTime = parseInt(a.orderId.split('-')[1]);
            const bTime = parseInt(b.orderId.split('-')[1]);
            return bTime - aTime;
        });
    }, [AdminOrders, searchTerm, sortBy]);

    const getOrderAgeClass = (orderId) => {
        const timestamp = parseInt(orderId.split('-')[1]);
        const orderDate = new Date(timestamp);
        const now = new Date();
        const diffInHours = (now - orderDate) / (1000 * 60 * 60);

        if (diffInHours < 6) return 'bg-green-50';
        if (diffInHours >= 24) return 'bg-red-50';
        return '';
    };

    return (
        <>
            <Header />

            <section className={`w-full h-[100vh] pt-[40px] py-8 px-0 xl:px-0 bg-gradient-to-r ${from} ${to}`}>
                <div className='w-full h-[90%] max-md:h-[80%] mt-16 overflow-y-auto flex flex-col justify-start items-center bg-white/[0.6] overflow-hidden shadow-lg relative'>
                    {isLoading ? (
                        <div className='absolute top-[40%]'>
                            <Spinner />
                        </div>
                    ) : (
                        <>
                            <div className='py-6 flex flex-col items-center'>
                                <h2 className='font-bold text-3xl font-montserrat'>Admin Orders</h2>
                                <input
                                    type='text'
                                    placeholder='Search by name or order ID...'
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className='mt-4 px-4 py-2 rounded border border-gray-300 shadow-sm'
                                />
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className='mt-4 px-4 py-2 rounded border border-gray-300 shadow-sm'
                                >
                                    <option value='date'>Sort by Date</option>
                                    <option value='status'>Sort by Status</option>
                                </select>
                            </div>

                            <div className='w-full'>
                                {!isMobile && (
                                    <div className='grid grid-flow-row min-w-[700px] max-lg:hidden'>
                                        <ul className='grid grid-cols-9 gap-2 text-xl font-semibold justify-items-center bg-gray-100 py-4'>
                                            <li>Order ID</li>
                                            <li>Name</li>
                                            <li>Email</li>
                                            <li>Phone</li>
                                            <li>Products</li>
                                            <li>Total Price</li>
                                            <li>Delivery Status</li>
                                            <li className='col-span-2'>Address</li>
                                        </ul>
                                        {filteredOrders.map((item) => (
                                            <div
                                                key={item.orderId}
                                                className={`transition-all duration-500 ease-in-out ${getOrderAgeClass(item.orderId)} ${recentlyUpdated === item.orderId ? 'bg-yellow-100' : ''}`}
                                            >
                                                <AdminOrder
                                                    orderId={item.orderId}
                                                    name={item.contactInfo.name}
                                                    email={item.contactInfo.email}
                                                    phone={item.contactInfo.phone}
                                                    products={item.orderedProducts}
                                                    totalPrice={item.totalPrice}
                                                    deliveryStatus={item.deliveryStatus}
                                                    address={item.contactInfo.address}
                                                    onStatusChange={handleStatusChange}
                                                    isUpdating={updatingStatus === item.orderId}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {isMobile && (
                                    <div className='grid lg:hidden'>
                                        <ul className='grid grid-cols-4 gap-2 text-xl font-semibold justify-items-center bg-gray-100 py-4'>
                                            <li>Order ID</li>
                                            <li>Name</li>
                                            <li>Total Price</li>
                                            <li>Details</li>
                                        </ul>
                                        {filteredOrders.map((item) => (
                                            <MobileAdminOrder
                                                key={item.orderId}
                                                orderId={item.orderId}
                                                name={item.contactInfo.name}
                                                email={item.contactInfo.email}
                                                phone={item.contactInfo.phone}
                                                products={item.orderedProducts}
                                                totalPrice={item.totalPrice}
                                                deliveryStatus={item.deliveryStatus}
                                                address={item.contactInfo.address}
                                                onStatusChange={handleStatusChange}
                                                isUpdating={updatingStatus === item.orderId}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </section>

            <section className='bg-black padding-x padding-t pb-8'>
                <Footer />
            </section>
        </>
    );
};

export default AdminOrders;
