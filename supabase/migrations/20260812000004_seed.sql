-- Global reference data: India conversation pricing and the prebuilt chatbot library.

-- Meta's per-conversation rates for India (INR). Update as Meta revises pricing.
insert into message_pricing (country, category, price, currency) values
  ('IN', 'marketing', 0.7846, 'INR'),
  ('IN', 'utility', 0.1150, 'INR'),
  ('IN', 'authentication', 0.1250, 'INR'),
  ('IN', 'service', 0.0000, 'INR')
on conflict (country, category) do update set price = excluded.price;

-- A minimal two-node starter flow; the builder replaces it on first edit.
create or replace function starter_flow(greeting text, prompt text)
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object(
    'nodes', jsonb_build_array(
      jsonb_build_object(
        'id', 'start',
        'type', 'send_message',
        'position', jsonb_build_object('x', 0, 'y', 0),
        'data', jsonb_build_object('text', greeting)
      ),
      jsonb_build_object(
        'id', 'ask',
        'type', 'ask_question',
        'position', jsonb_build_object('x', 0, 'y', 160),
        'data', jsonb_build_object('text', prompt, 'variable', 'answer')
      )
    ),
    'edges', jsonb_build_array(
      jsonb_build_object('id', 'e1', 'source', 'start', 'target', 'ask')
    )
  );
$$;

insert into chatbot_library (title, description, industry, sort_order, definition) values
  ('Banking & Finance Support',
   'High-priority banking chatbot helper for card blocking, fraud reporting, transaction issues, and accounts FAQ.',
   'Banking', 1,
   starter_flow('Welcome to secure banking support. How can we help?', 'Choose: Block card, Report fraud, Transaction issue, or Account FAQ.')),

  ('Delivery & Logistics Tracking',
   'Logistics tracking chatbot for checking package status via Tracking ID, reporting delivery issues, or agent handoff.',
   'Logistics', 2,
   starter_flow('Hi! I can help track your shipment.', 'Please share your Tracking ID.')),

  ('Restaurant Support & Feedback',
   'Restaurant customer service chatbot for missing items reporting, FAQ searches, and feedback collection.',
   'Restaurant', 3,
   starter_flow('Thanks for dining with us!', 'Is this about a missing item, a question, or feedback?')),

  ('Ecommerce Support Flow',
   'Complete ecommerce support flow handling order tracking with Order ID verification, returns/refunds processing, and product FAQs.',
   'Ecommerce', 4,
   starter_flow('Welcome to our store support.', 'Please share your Order ID to continue.')),

  ('Customer Support Chatbot',
   'Complete customer support flow with ticket creation, FAQ search, and agent assignment. Customers can raise issues and get help fast.',
   'General', 5,
   starter_flow('Hello! How can we help you today?', 'Describe your issue and we will create a ticket.')),

  ('SaaS Product Demo Booking',
   'Software demo booking flow with product interest qualification, company details collection, and calendar scheduling.',
   'SaaS', 6,
   starter_flow('Thanks for your interest in a demo!', 'Which product would you like to see?')),

  ('Car Service & Maintenance',
   'Automotive service scheduler with vehicle information, service type selection, appointment booking, and reminders.',
   'Automotive', 7,
   starter_flow('Let us book your car service.', 'What is your vehicle registration number?')),

  ('Travel Package Booking',
   'Complete travel booking experience with destination selection, package customization, traveler details, and payment.',
   'Travel', 8,
   starter_flow('Ready to plan your trip?', 'Which destination are you interested in?')),

  ('Healthcare Appointment Booking',
   'Clinic appointment scheduler covering department selection, doctor availability, and confirmation reminders.',
   'Healthcare', 9,
   starter_flow('Welcome to our clinic.', 'Which department do you need an appointment with?')),

  ('Real Estate Lead Qualification',
   'Property enquiry flow capturing budget, location preference, property type and site-visit scheduling.',
   'Real Estate', 10,
   starter_flow('Looking for a property?', 'What is your preferred location and budget?')),

  ('Education Course Enquiry',
   'Course enquiry bot collecting programme interest, qualification and counsellor callback scheduling.',
   'Education', 11,
   starter_flow('Interested in our courses?', 'Which programme would you like to know about?')),

  ('Insurance Policy Assistant',
   'Policy support flow for premium reminders, claim status checks, and new policy quotes.',
   'Insurance', 12,
   starter_flow('Welcome to policy support.', 'Do you need a claim status, premium info, or a new quote?')),

  ('Fitness & Gym Membership',
   'Membership bot handling plan comparison, trial booking, and renewal reminders.',
   'Fitness', 13,
   starter_flow('Ready to start training?', 'Would you like a trial session or membership details?')),

  ('Salon & Spa Booking',
   'Appointment flow for service selection, stylist preference, slot booking and confirmations.',
   'Beauty', 14,
   starter_flow('Book your next appointment.', 'Which service would you like?')),

  ('Event Registration',
   'Event bot handling registration, ticket type selection, attendee details and reminders.',
   'Events', 15,
   starter_flow('Welcome to the event desk.', 'Which ticket type would you like to register for?')),

  ('Retail Store Locator',
   'Helps customers find the nearest store, check stock availability and opening hours.',
   'Retail', 16,
   starter_flow('Looking for a store near you?', 'Share your city or pincode.')),

  ('Utility Bill Payment Reminder',
   'Bill reminder and payment flow with due date lookup and payment link delivery.',
   'Utilities', 17,
   starter_flow('Check your bill status here.', 'Please share your consumer number.')),

  ('Job Application Screening',
   'Recruitment bot collecting role interest, experience, resume upload and interview scheduling.',
   'Recruitment', 18,
   starter_flow('Thanks for applying!', 'Which role are you applying for?')),

  ('Order Feedback & NPS',
   'Post-purchase feedback flow with star rating, NPS score and open comments.',
   'General', 19,
   starter_flow('How did we do?', 'Rate your experience from 1 to 5.')),

  ('Abandoned Cart Recovery',
   'Re-engagement flow reminding customers of items left in cart with a discount offer.',
   'Ecommerce', 20,
   starter_flow('You left something behind!', 'Would you like to complete your order?')),

  ('Lead Capture & Routing',
   'Generic lead qualification bot capturing name, requirement and budget, then routing to the right agent.',
   'General', 21,
   starter_flow('Thanks for reaching out!', 'Tell us what you are looking for.'));

drop function starter_flow(text, text);
