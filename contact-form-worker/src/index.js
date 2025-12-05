export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }
    
    // Only allow POST requests
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }
    
    try {
      // Parse the incoming form data
      const formData = await request.json();
      const { name, email, message } = formData;
      
      // Validate required fields
      if (!name || !email || !message) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields' }),
          {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          }
        );
      }
      
      // Send email via Resend
      const send_request = new Request('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.RESEND_API_KEY}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Contact Form <noreply@mail.claudeshannon.site>',
          to: ['contact@claudeshannon.site'],
          reply_to: email,
          subject: `New Contact Form Submission from ${name}`,
          html: `
            <h2>New Contact Form Submission</h2>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Message:</strong></p>
            <p>${message.replace(/\n/g, '<br>')}</p>
          `,
        }),
      });
      
      const response = await fetch(send_request);
      
      if (response.ok) {
        return new Response(
          JSON.stringify({ success: true, message: 'Email sent successfully!' }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          }
        );
      } else {
        const errorText = await response.text();
        console.error('Email service error:', errorText);
        
        // Parse error response if possible
        let errorMessage = 'Failed to send email';
        let statusCode = 500;
        
        try {
          const errorData = JSON.parse(errorText);
          
          // Check for validation errors (email format issues)
          if (errorData.statusCode === 422 || errorData.name === 'validation_error') {
            if (errorData.message?.includes('email') || errorData.message?.includes('reply_to')) {
              errorMessage = 'Invalid email address format';
              statusCode = 422;
            } else {
              errorMessage = 'Invalid input data';
              statusCode = 422;
            }
          }
        } catch (e) {
          // If parsing fails, use generic error
        }
        
        return new Response(
          JSON.stringify({ error: errorMessage }),
          {
            status: statusCode,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          }
        );
      }
    } catch (error) {
      console.error('Error:', error);
      return new Response(
        JSON.stringify({ error: 'Internal server error' }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }
  },
};
