import axios from 'axios';
import { API } from '../config';

// This is a placeholder for the actual OpenAI API key
// In a production environment, this should be stored securely on the server
const OPENAI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY
console.log(OPENAI_API_KEY)
/**
 * Fetch all products from the API
 * @returns {Promise<Array>} - A promise that resolves to an array of products
 */
const fetchAllProducts = async () => {
  try {
    const response = await axios.get(`${API}/products?limit=100`);
    return response.data;
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
};

/**
 * Fetch a specific product by ID from the API
 * @param {string} productId - The ID of the product to fetch
 * @returns {Promise<Object>} - A promise that resolves to the product object
 */
const fetchProductById = async (productId) => {
  try {
    const response = await axios.get(`${API}/product/${productId}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching product with ID ${productId}:`, error);
    return null;
  }
};

/**
 * Search for products by name
 * @param {string} searchTerm - The search term to use
 * @returns {Promise<Array>} - A promise that resolves to an array of matching products
 */
const searchProducts = async (searchTerm) => {
  try {
    const response = await axios.get(`${API}/products/search?search=${encodeURIComponent(searchTerm)}`);
    return response.data;
  } catch (error) {
    console.error(`Error searching for products with term "${searchTerm}":`, error);
    return [];
  }
};

/**
 * Fetch user's order history
 * @param {string} userId - The ID of the user
 * @param {string} token - Authentication token
 * @returns {Promise<Array>} - A promise that resolves to an array of orders
 */
const fetchUserOrders = async (userId, token) => {
  try {
    const response = await axios.get(`${API}/orders/by/user/${userId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    console.error(`Error fetching orders for user ${userId}:`, error);
    return [];
  }
};

/**
 * Fetch order status
 * @param {string} orderId - The ID of the order
 * @param {string} token - Authentication token
 * @returns {Promise<Object>} - A promise that resolves to the order status
 */
const fetchOrderStatus = async (orderId, token) => {
  try {
    const response = await axios.get(`${API}/order/status/${orderId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    console.error(`Error fetching status for order ${orderId}:`, error);
    return null;
  }
};

/**
 * Send a product-related query to OpenAI and get a response
 * @param {string} query - User query about products
 * @param {Object} user - User object with id and token
 * @returns {Promise<string>} - A promise that resolves to the AI response
 */
export const askAboutProducts = async (query, user = null) => {
  try {
    console.log(OPENAI_API_KEY)

    // If no OpenAI API key is provided, return a fallback response
    if (!OPENAI_API_KEY || OPENAI_API_KEY === 'your-openai-api-key') {
      return "I'm sorry, but I need an OpenAI API key to provide detailed product information. Please add your API key to the .env file.";
    }

    // Check if the query is asking for a specific product
    const productQueryRegex = /(tell me about|what is|describe|info on|information about|details of)\s+(.+)/i;
    const match = query.match(productQueryRegex);
    
    let productData = [];
    let orderData = [];
    
    // Fetch product data
    if (match && match[2]) {
      // If the query is about a specific product, search for it
      const productName = match[2].trim();
      const searchResults = await searchProducts(productName);
      
      if (searchResults.length > 0) {
        // If we found products, get detailed information for the first match
        const productId = searchResults[0]._id;
        const productDetails = await fetchProductById(productId);
        
        if (productDetails) {
          productData = [productDetails];
        } else {
          productData = searchResults;
        }
      } else {
        // If no specific product was found, fetch all products
        productData = await fetchAllProducts();
      }
    } else {
      // For general queries, fetch all products
      productData = await fetchAllProducts();
    }

    // Fetch order data if user is logged in
    if (user && user.id && user.token) {
      orderData = await fetchUserOrders(user.id, user.token);
    }

    // Prepare product data for the prompt
    const formattedProductData = productData.map(product => ({
      id: product._id,
      name: product.name,
      price: product.price,
      description: product.description,
      category: product.category ? product.category.name : 'Not specified',
      quantity: product.quantity,
      shipping: product.shipping ? 'Yes' : 'No'
    }));

    // Prepare order data for the prompt
    const formattedOrderData = orderData.map(order => ({
      id: order._id,
      date: new Date(order.createdAt).toLocaleDateString(),
      status: order.status,
      amount: order.amount,
      products: order.products.map(item => ({
        name: item.name,
        price: item.price,
        count: item.count
      }))
    }));

    // Create a prompt that includes all product and order information
    const prompt = `
      You are a helpful e-commerce assistant. The user has asked: "${query}"
      
      Here is information about our products:
      ${JSON.stringify(formattedProductData, null, 2)}
      
      ${user ? `Here is the user's order history:
      ${JSON.stringify(formattedOrderData, null, 2)}` : ''}
      
      Please provide a helpful response based on the user's query. Answer any questions they have about our products.
      If they're asking about a specific product, find that product in the list and provide detailed information about it.
      If they're asking for a list of products, provide a concise list with brief descriptions.
      If they're asking for recommendations, suggest products based on the available information.
      If they're asking about pricing, shipping, or other e-commerce related questions, provide helpful information.
      ${user ? 'If they\'re asking about their order history or order status, provide information from their order history.' : ''}
      
      Make your response informative, engaging, and helpful for the user.
    `;

    // Call OpenAI API with the prompt
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful e-commerce assistant that provides detailed product information and answers questions about our store.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        }
      }
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('Error asking about products:', error);
    return "I'm sorry, but I encountered an error while processing your request. Please try again later.";
  }
}; 