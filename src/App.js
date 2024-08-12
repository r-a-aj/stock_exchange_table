import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [role, setRole] = useState('buyer');
  const [price, setPrice] = useState(0);
  const [quantity, setQuantity] = useState(0);
  const [buyers, setBuyers] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [completedOrders, setCompletedOrders] = useState([]);

  useEffect(() => {
    fetchBuyers();
    fetchSellers();
    fetchCompletedOrders();
  }, []);

  const fetchBuyers = async () => {
    const response = await axios.get('http://localhost:5000/orders/buyers');
    setBuyers(response.data);
  };

  const fetchSellers = async () => {
    const response = await axios.get('http://localhost:5000/orders/sellers');
    setSellers(response.data);
  };

  const fetchCompletedOrders = async () => {
    const response = await axios.get('http://localhost:5000/orders/completed');
    setCompletedOrders(response.data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newOrder = { price, quantity };
    if (parseInt(quantity) === 0 || parseInt(price) === 0) {
      alert("Price and Quantity cannot be zero!");
    } else {
      console.log(newOrder);
      if (role === 'buyer') {
        await axios.post('http://localhost:5000/buyerorder', newOrder);
      } else {
        await axios.post('http://localhost:5000/sellerorder', newOrder);
      }
      fetchBuyers();
      fetchSellers();
      fetchCompletedOrders();
    }
  };

  const handleClearBuyers = async () => {
    await axios.delete('http://localhost:5000/orders/clear/buyers');
    fetchBuyers();
  };

  const handleClearSellers = async () => {
    await axios.delete('http://localhost:5000/orders/clear/sellers');
    fetchSellers();
  };

  const handleClearCompleted = async () => {
    await axios.delete('http://localhost:5000/orders/clear/completed');
    fetchCompletedOrders();
  };

  return (
    <div className="App">
      <h1>Order Matching System</h1>

      <form onSubmit={handleSubmit}>
        <div>
          <label>Role: </label>
          <select className="buyer-seller" value={role} onChange={(e) => setRole(e.target.value)}>
            <option className="buyer" value="buyer">Buyer</option>
            <option className="seller" value="seller">Seller</option>
          </select>
        </div>
        <div>
          <label>Price: </label>
          <input
            type="number"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Quantity: </label>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
          />
        </div>
        <button type="submit" className='submit-btn'>Submit Order</button>
      </form>
      <h2>Pending Orders Table</h2>
      <div className='pending-order-container'>
        <div>
          <table>
            <thead>
              <tr className='buyer'>
                <th>Buyer Price</th>
                <th>Buyer Quantity</th>
              </tr>
            </thead>
            <tbody>
              {buyers.map(order => (
                <tr key={order.id}>
                  <td className='buyer'>{order.buyer_price}</td>
                  <td className='buyer'>{order.buyer_qty}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={handleClearBuyers} className='clear-buyer'>Clear Buyers</button>
        </div>

        <div>
          <table>
            <thead>
              <tr className='seller'>
                <th>Seller Price</th>
                <th>Seller Quantity</th>
              </tr>
            </thead>
            <tbody>
              {sellers.map(order => (
                <tr key={order.id}>
                  <td className='seller'>{order.seller_price}</td>
                  <td className='seller'>{order.seller_qty}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={handleClearSellers} className='clear-seller'>Clear Sellers</button>
        </div>
      </div>

      <h2>Completed Orders Table</h2>
      <div className='complete-order'>
        <table>
          <thead>
            <tr>
              <th>Price</th>
              <th>Qty</th>
            </tr>
          </thead>
          <tbody>
            {completedOrders.map(order => (
              <tr key={order.id}>
                <td>{order.price}</td>
                <td>{order.qty}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <button onClick={handleClearCompleted} className='complete-btn'>Clear Completed Orders</button>
      </div>
    </div>
  );
}

export default App;
