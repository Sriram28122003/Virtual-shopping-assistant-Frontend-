import axios from 'axios';

// This is a placeholder for the actual OpenAI API key
// In a production environment, this should be stored securely on the server
const OPENAI_API_KEY = ''
/**
 * Generate a product description using OpenAI's GPT-4 model
 * @param {Object} product - The product object from the API
 * @returns {Promise<string>} - A promise that resolves to the generated description
 */
export const generateProductDescription = async (product) => {
  try {
    // If no OpenAI API key is provided, return a fallback description
    if (!OPENAI_API_KEY || OPENAI_API_KEY === 'your-openai-api-key') {
      return `This is ${product.name}, priced at $${product.price}. ${product.description}`;
    }

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful e-commerce assistant that provides detailed product descriptions.'
          },
          {
            role: 'user',
            content: `Please provide a detailed and engaging description for the following product: 
              Name: ${product.name}
              Price: $${product.price}
              Category: ${product.category ? product.category.name : 'Not specified'}
              Current description: ${product.description}
              
              Make the description informative, highlight key features, and include potential use cases.`
          }
        ],
        temperature: 0.7,
        max_tokens: 300
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
    console.error('Error generating product description:', error);
    // Return a fallback description if the API call fails
    return `This is ${product.name}, priced at $${product.price}. ${product.description}`;
  }
}; 