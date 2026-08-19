"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  Car,
  Check,
  ChevronRight,
  Eye,
  FileText,
  GraduationCap,
  Heart,
  HeartHandshake,
  Home,
  Info,
  Landmark,
  Layers,
  MessageCircle,
  MoreVertical,
  Plus,
  Search,
  ShoppingCart,
  Sparkles,
  Tv,
  Video,
  Wrench,
  X,
  ExternalLink,
  Edit3,
} from "lucide-react";
import { toast } from "sonner";

interface TemplateItem {
  id: string;
  name: string;
  technicalName: string;
  category: "marketing" | "utility" | "authentication";
  subcategory:
    | "ecommerce"
    | "education"
    | "banking"
    | "webinar"
    | "healthcare"
    | "automobile"
    | "real-estate"
    | "service"
    | "nonprofit";
  headline?: string;
  body: string;
  footer?: string;
  headerType?: "IMAGE" | "TEXT" | "VIDEO" | "DOCUMENT";
  buttonText?: string;
  buttonType?: "URL" | "QUICK_REPLY";
  language: string;
  componentsCount: number;
}

const ALL_TEMPLATES: TemplateItem[] = [
  // ================= NONPROFIT (5) =================
  {
    id: "np-1",
    name: "nonprofit fundraising campaign",
    technicalName: "nonprofit_fundraising_campaign",
    category: "marketing",
    subcategory: "nonprofit",
    body: "Hi {{1}}, support our {{2}} campaign and help us reach more people in need. Every contribution matters.",
    footer: "Together, we can make a difference.",
    headerType: "IMAGE",
    buttonText: "Donate Now",
    buttonType: "URL",
    language: "EN_US",
    componentsCount: 4,
  },
  {
    id: "np-2",
    name: "nonprofit campaigns carousel",
    technicalName: "nonprofit_campaigns_carousel",
    category: "marketing",
    subcategory: "nonprofit",
    body: "Hi {{1}}, choose a cause you care about and support our active campaigns.",
    footer: "Building brighter futures.",
    headerType: "IMAGE",
    buttonText: "Explore Causes",
    buttonType: "URL",
    language: "EN_US",
    componentsCount: 4,
  },
  {
    id: "np-3",
    name: "nonprofit donation receipt",
    technicalName: "nonprofit_donation_receipt",
    category: "utility",
    subcategory: "nonprofit",
    body: "Hi {{1}}, your donation receipt for contribution ID {{2}} is ready. Please download it from the link below.",
    footer: "Tax exemption certificate 80G included.",
    headerType: "DOCUMENT",
    buttonText: "Download Receipt",
    buttonType: "URL",
    language: "EN_US",
    componentsCount: 4,
  },
  {
    id: "np-4",
    name: "nonprofit volunteer drive invite",
    technicalName: "nonprofit_volunteer_drive_invite",
    category: "marketing",
    subcategory: "nonprofit",
    body: "Hi {{1}}, join our volunteer drive on {{2}} at {{3}}. Your time can make a real difference.",
    footer: "Make an impact in your community.",
    headerType: "IMAGE",
    buttonText: "Register as Volunteer",
    buttonType: "URL",
    language: "EN_US",
    componentsCount: 4,
  },
  {
    id: "np-5",
    name: "nonprofit donation thank you",
    technicalName: "nonprofit_donation_thank_you",
    category: "utility",
    subcategory: "nonprofit",
    headline: "Thank You for Donating",
    body: "Hi {{1}}, thank you for your generous donation of ₹{{2}}. Your support helps us serve our community.",
    footer: "With sincere gratitude from our entire team.",
    headerType: "TEXT",
    buttonText: "View Impact Report",
    buttonType: "URL",
    language: "EN_US",
    componentsCount: 3,
  },

  // ================= HEALTHCARE (5) =================
  {
    id: "hc-1",
    name: "healthcare appointment confirmation",
    technicalName: "healthcare_appointment_confirmation",
    category: "utility",
    subcategory: "healthcare",
    headline: "Appointment Confirmed",
    body: "Hi {{1}}, your appointment with Dr. {{2}} is confirmed for {{3}} at {{4}}.",
    footer: "Please arrive 10 minutes before your slot.",
    headerType: "TEXT",
    buttonText: "View Clinic Location",
    buttonType: "URL",
    language: "EN_US",
    componentsCount: 3,
  },
  {
    id: "hc-2",
    name: "healthcare medicine reminder",
    technicalName: "healthcare_medicine_reminder",
    category: "utility",
    subcategory: "healthcare",
    headline: "Medicine Reminder",
    body: "Hi {{1}}, this is a reminder to take your prescribed medicine {{2}} at {{3}}.",
    footer: "Stay healthy and adhere to your prescription.",
    headerType: "TEXT",
    buttonText: "I have taken it",
    buttonType: "QUICK_REPLY",
    language: "EN_US",
    componentsCount: 3,
  },
  {
    id: "hc-3",
    name: "healthcare lab report ready",
    technicalName: "healthcare_lab_report_ready",
    category: "utility",
    subcategory: "healthcare",
    body: "Hi {{1}}, your lab report for {{2}} is now available. Please consult your doctor for medical advice.",
    footer: "Diagnostic Care Centre",
    headerType: "DOCUMENT",
    buttonText: "Download Lab Report",
    buttonType: "URL",
    language: "EN_US",
    componentsCount: 4,
  },
  {
    id: "hc-4",
    name: "healthcare services carousel",
    technicalName: "healthcare_services_carousel",
    category: "marketing",
    subcategory: "healthcare",
    body: "Hi {{1}}, explore our healthcare services designed for your well-being.",
    footer: "Comprehensive care for your family.",
    headerType: "IMAGE",
    buttonText: "Book Checkup",
    buttonType: "URL",
    language: "EN_US",
    componentsCount: 4,
  },
  {
    id: "hc-5",
    name: "healthcare wellness checkup discount",
    technicalName: "healthcare_wellness_checkup_discount",
    category: "marketing",
    subcategory: "healthcare",
    body: "Hi {{1}}, get 30% off on full body health packages this month. Use code {{2}} at checkout.",
    footer: "Offer valid till end of month.",
    headerType: "IMAGE",
    buttonText: "Claim Discount",
    buttonType: "URL",
    language: "EN_US",
    componentsCount: 4,
  },

  // ================= WEBINAR (5) =================
  {
    id: "wb-1",
    name: "webinar invitation growth masterclass",
    technicalName: "webinar_invitation_growth_masterclass",
    category: "marketing",
    subcategory: "webinar",
    body: "Hi {{1}}, join our live webinar on {{2}} and learn practical strategies from industry experts. Seats are limited.",
    footer: "Live Q&A included.",
    headerType: "IMAGE",
    buttonText: "Reserve Free Seat",
    buttonType: "URL",
    language: "EN_US",
    componentsCount: 4,
  },
  {
    id: "wb-2",
    name: "webinar registration confirmation",
    technicalName: "webinar_registration_confirmation",
    category: "utility",
    subcategory: "webinar",
    headline: "Registration Confirmed",
    body: "Hi {{1}}, your registration for {{2}} is confirmed. The session starts on {{3}} at {{4}}.",
    footer: "Link to join will be active 15 mins prior.",
    headerType: "TEXT",
    buttonText: "Add to Calendar",
    buttonType: "URL",
    language: "EN_US",
    componentsCount: 3,
  },
  {
    id: "wb-3",
    name: "webinar reminder one hour",
    technicalName: "webinar_reminder_one_hour",
    category: "utility",
    subcategory: "webinar",
    headline: "Webinar Starts Soon",
    body: "Hi {{1}}, reminder that {{2}} starts in 1 hour. Keep your questions ready for the live Q&A.",
    footer: "See you in the session!",
    headerType: "TEXT",
    buttonText: "Join Stream Now",
    buttonType: "URL",
    language: "EN_US",
    componentsCount: 3,
  },
  {
    id: "wb-4",
    name: "webinar recording available",
    technicalName: "webinar_recording_available",
    category: "utility",
    subcategory: "webinar",
    body: "Hi {{1}}, thanks for attending {{2}}. The recording is now available for you to watch anytime.",
    footer: "Access available for 30 days.",
    headerType: "VIDEO",
    buttonText: "Watch Recording",
    buttonType: "URL",
    language: "EN_US",
    componentsCount: 4,
  },
  {
    id: "wb-5",
    name: "webinar series carousel",
    technicalName: "webinar_series_carousel",
    category: "marketing",
    subcategory: "webinar",
    body: "Hi {{1}}, explore our upcoming webinar series and choose the session that fits your goals.",
    footer: "Master new skills weekly.",
    headerType: "IMAGE",
    buttonText: "View Schedule",
    buttonType: "URL",
    language: "EN_US",
    componentsCount: 4,
  },

  // ================= ECOMMERCE (5) =================
  {
    id: "ec-1",
    name: "ecommerce order confirmation",
    technicalName: "ecommerce_order_confirmation",
    category: "utility",
    subcategory: "ecommerce",
    headline: "Order Confirmed",
    body: "Hi {{1}}, your order #{{2}} for {{3}} has been confirmed and is being packed.",
    footer: "Track delivery status in real-time.",
    headerType: "TEXT",
    buttonText: "Track Order",
    buttonType: "URL",
    language: "EN_US",
    componentsCount: 3,
  },
  {
    id: "ec-2",
    name: "ecommerce shipping update",
    technicalName: "ecommerce_shipping_update",
    category: "utility",
    subcategory: "ecommerce",
    headline: "Out for Delivery",
    body: "Hi {{1}}, your package is out for delivery with courier partner {{2}}. Delivery OTP is {{3}}.",
    footer: "Expected delivery by 6 PM today.",
    headerType: "TEXT",
    buttonText: "Live GPS Tracking",
    buttonType: "URL",
    language: "EN_US",
    componentsCount: 3,
  },
  {
    id: "ec-3",
    name: "ecommerce abandoned cart discount",
    technicalName: "ecommerce_abandoned_cart_discount",
    category: "marketing",
    subcategory: "ecommerce",
    body: "Hi {{1}}, items in your cart are waiting! Complete your order now and enjoy 15% off with code {{2}}.",
    footer: "Cart reserved for 24 hours.",
    headerType: "IMAGE",
    buttonText: "Complete Purchase",
    buttonType: "URL",
    language: "EN_US",
    componentsCount: 4,
  },
  {
    id: "ec-4",
    name: "ecommerce product back in stock",
    technicalName: "ecommerce_product_back_in_stock",
    category: "marketing",
    subcategory: "ecommerce",
    body: "Good news {{1}}! The item {{2}} you were looking for is back in stock. Grab yours before it runs out.",
    footer: "Limited quantities available.",
    headerType: "IMAGE",
    buttonText: "Buy Now",
    buttonType: "URL",
    language: "EN_US",
    componentsCount: 4,
  },
  {
    id: "ec-5",
    name: "ecommerce festive flash sale",
    technicalName: "ecommerce_festive_flash_sale",
    category: "marketing",
    subcategory: "ecommerce",
    body: "Hi {{1}}, our biggest festive sale is live! Get up to 50% discount on entire {{2}} collection today.",
    footer: "Free shipping on orders above ₹499.",
    headerType: "IMAGE",
    buttonText: "Shop Collection",
    buttonType: "URL",
    language: "EN_US",
    componentsCount: 4,
  },

  // ================= EDUCATION (5) =================
  {
    id: "ed-1",
    name: "education course enrollment confirmation",
    technicalName: "education_course_enrollment_confirmation",
    category: "utility",
    subcategory: "education",
    headline: "Welcome to Class",
    body: "Hi {{1}}, you are successfully enrolled in {{2}}. Your portal credentials have been sent to {{3}}.",
    footer: "Class starts next Monday.",
    headerType: "TEXT",
    buttonText: "Access Student Portal",
    buttonType: "URL",
    language: "EN_US",
    componentsCount: 3,
  },
  {
    id: "ed-2",
    name: "education exam schedule announcement",
    technicalName: "education_exam_schedule_announcement",
    category: "utility",
    subcategory: "education",
    body: "Dear {{1}}, the exam schedule for semester {{2}} has been published. Please review your hall ticket details.",
    footer: "Controller of Examinations",
    headerType: "DOCUMENT",
    buttonText: "Download Hall Ticket",
    buttonType: "URL",
    language: "EN_US",
    componentsCount: 4,
  },
  {
    id: "ed-3",
    name: "education new batch scholarship offer",
    technicalName: "education_new_batch_scholarship_offer",
    category: "marketing",
    subcategory: "education",
    body: "Hi {{1}}, applications for {{2}} merit scholarship are now open. Get up to 100% tuition waiver.",
    footer: "Apply before {{3}}.",
    headerType: "IMAGE",
    buttonText: "Apply for Scholarship",
    buttonType: "URL",
    language: "EN_US",
    componentsCount: 4,
  },
  {
    id: "ed-4",
    name: "education webinar masterclass invite",
    technicalName: "education_webinar_masterclass_invite",
    category: "marketing",
    subcategory: "education",
    body: "Hi {{1}}, join our career masterclass on {{2}} with senior instructors from top tech institutes.",
    footer: "Includes certificate of participation.",
    headerType: "IMAGE",
    buttonText: "Register Free",
    buttonType: "URL",
    language: "EN_US",
    componentsCount: 4,
  },
  {
    id: "ed-5",
    name: "education fee payment receipt",
    technicalName: "education_fee_payment_receipt",
    category: "utility",
    subcategory: "education",
    headline: "Payment Received",
    body: "Hi {{1}}, we received fee payment of ₹{{2}} for student ID {{3}}. Transaction ref: {{4}}.",
    footer: "Official fee acknowledgment.",
    headerType: "TEXT",
    buttonText: "Download Receipt",
    buttonType: "URL",
    language: "EN_US",
    componentsCount: 3,
  },

  // ================= BANKING (5) =================
  {
    id: "bk-1",
    name: "banking transaction alert",
    technicalName: "banking_transaction_alert",
    category: "utility",
    subcategory: "banking",
    headline: "Transaction Alert",
    body: "A/C *{{1}} debited with ₹{{2}} on {{3}}. Available balance is ₹{{4}}.",
    footer: "If not done by you, block card instantly.",
    headerType: "TEXT",
    buttonText: "Report Dispute",
    buttonType: "URL",
    language: "EN_US",
    componentsCount: 3,
  },
  {
    id: "bk-2",
    name: "banking otp verification",
    technicalName: "banking_otp_verification",
    category: "authentication",
    subcategory: "banking",
    body: "{{1}} is your one-time password (OTP) for login verification. Valid for 10 minutes. Do not share with anyone.",
    footer: "Security Verification",
    headerType: "TEXT",
    buttonText: "Copy OTP Code",
    buttonType: "QUICK_REPLY",
    language: "EN_US",
    componentsCount: 3,
  },
  {
    id: "bk-3",
    name: "banking loan pre approval offer",
    technicalName: "banking_loan_pre_approval_offer",
    category: "marketing",
    subcategory: "banking",
    body: "Congratulations {{1}}! You have pre-approved personal loan offer of up to ₹{{2}} with zero paperwork.",
    footer: "Interest rate starting 10.49% p.a.",
    headerType: "IMAGE",
    buttonText: "Check Loan Limit",
    buttonType: "URL",
    language: "EN_US",
    componentsCount: 4,
  },
  {
    id: "bk-4",
    name: "banking monthly statement ready",
    technicalName: "banking_monthly_statement_ready",
    category: "utility",
    subcategory: "banking",
    body: "Dear {{1}}, your e-statement for account *{{2}} for the month of {{3}} is now available for download.",
    footer: "Password is your 4-digit birth year + PAN.",
    headerType: "DOCUMENT",
    buttonText: "View Statement",
    buttonType: "URL",
    language: "EN_US",
    componentsCount: 4,
  },
  {
    id: "bk-5",
    name: "banking credit card reward points",
    technicalName: "banking_credit_card_reward_points",
    category: "marketing",
    subcategory: "banking",
    body: "Hi {{1}}, you have {{2}} unredeemed credit card reward points expiring on {{3}}. Convert to vouchers today.",
    footer: "Redeem against shopping and flights.",
    headerType: "IMAGE",
    buttonText: "Redeem Points",
    buttonType: "URL",
    language: "EN_US",
    componentsCount: 4,
  },

  // ================= AUTOMOBILE (5) =================
  {
    id: "au-1",
    name: "automobile test drive booking confirmation",
    technicalName: "automobile_test_drive_booking_confirmation",
    category: "utility",
    subcategory: "automobile",
    headline: "Test Drive Confirmed",
    body: "Hi {{1}}, your test drive for {{2}} is confirmed at {{3}} dealership on {{4}}.",
    footer: "Please carry valid driving license.",
    headerType: "TEXT",
    buttonText: "Directions to Showroom",
    buttonType: "URL",
    language: "EN_US",
    componentsCount: 3,
  },
  {
    id: "au-2",
    name: "automobile service maintenance reminder",
    technicalName: "automobile_service_maintenance_reminder",
    category: "utility",
    subcategory: "automobile",
    headline: "Service Due",
    body: "Hi {{1}}, your vehicle {{2}} is due for periodic maintenance service. Book doorstep pick & drop.",
    footer: "Ensure optimal vehicle performance.",
    headerType: "TEXT",
    buttonText: "Schedule Service Slot",
    buttonType: "URL",
    language: "EN_US",
    componentsCount: 3,
  },
  {
    id: "au-3",
    name: "automobile vehicle inspection report",
    technicalName: "automobile_vehicle_inspection_report",
    category: "utility",
    subcategory: "automobile",
    body: "Hi {{1}}, the multi-point inspection report for your vehicle {{2}} is ready with diagnostic results.",
    footer: "Authorized Service Center",
    headerType: "DOCUMENT",
    buttonText: "Download Full Report",
    buttonType: "URL",
    language: "EN_US",
    componentsCount: 4,
  },
  {
    id: "au-4",
    name: "automobile new car launch event",
    technicalName: "automobile_new_car_launch_event",
    category: "marketing",
    subcategory: "automobile",
    body: "Hi {{1}}, experience the all-new {{2}} with futuristic electric powertrain and ADAS level 2 safety.",
    footer: "Special pre-booking benefits available.",
    headerType: "IMAGE",
    buttonText: "Explore Features",
    buttonType: "URL",
    language: "EN_US",
    componentsCount: 4,
  },
  {
    id: "au-5",
    name: "automobile festive exchange bonus",
    technicalName: "automobile_festive_exchange_bonus",
    category: "marketing",
    subcategory: "automobile",
    body: "Upgrade your drive {{1}}! Get additional exchange bonus of up to ₹{{2}} when trading in old vehicle.",
    footer: "Free valuation at your doorstep.",
    headerType: "IMAGE",
    buttonText: "Get Free Valuation",
    buttonType: "URL",
    language: "EN_US",
    componentsCount: 4,
  },

  // ================= REAL-ESTATE (5) =================
  {
    id: "re-1",
    name: "real-estate site visit confirmation",
    technicalName: "real_estate_site_visit_confirmation",
    category: "utility",
    subcategory: "real-estate",
    headline: "Site Visit Confirmed",
    body: "Hi {{1}}, your visit to {{2}} project is confirmed for {{3}}. Relationship manager {{4}} will guide you.",
    footer: "Complimentary cab facility arranged.",
    headerType: "TEXT",
    buttonText: "Open Location Map",
    buttonType: "URL",
    language: "EN_US",
    componentsCount: 3,
  },
  {
    id: "re-2",
    name: "real-estate property booking token receipt",
    technicalName: "real_estate_booking_token_receipt",
    category: "utility",
    subcategory: "real-estate",
    body: "Dear {{1}}, we acknowledge receipt of booking token for unit #{{2}} in {{3}}. Welcome to the community.",
    footer: "Official Developer Booking Slip",
    headerType: "DOCUMENT",
    buttonText: "Download Receipt",
    buttonType: "URL",
    language: "EN_US",
    componentsCount: 4,
  },
  {
    id: "re-3",
    name: "real-estate exclusive penthouse launch",
    technicalName: "real_estate_exclusive_penthouse_launch",
    category: "marketing",
    subcategory: "real-estate",
    body: "Hi {{1}}, presenting ultra-luxury 4 & 5 BHK sky villas at {{2}} with private deck and panoramic city views.",
    footer: "Early bird pricing for VIP clients.",
    headerType: "IMAGE",
    buttonText: "Download Brochure",
    buttonType: "URL",
    language: "EN_US",
    componentsCount: 4,
  },
  {
    id: "re-4",
    name: "real-estate investment opportunities brochure",
    technicalName: "real_estate_investment_opportunities",
    category: "marketing",
    subcategory: "real-estate",
    body: "Hi {{1}}, discover high-yielding commercial real estate assets with assured {{2}}% rental returns.",
    footer: "Grade A pre-leased office spaces.",
    headerType: "IMAGE",
    buttonText: "View ROI Calculator",
    buttonType: "URL",
    language: "EN_US",
    componentsCount: 4,
  },
  {
    id: "re-5",
    name: "real-estate price drop alert",
    technicalName: "real_estate_price_drop_alert",
    category: "marketing",
    subcategory: "real-estate",
    body: "Price Drop Alert {{1}}! The 3 BHK apartment in {{2}} is now available at revised pricing with zero GST.",
    footer: "Only 2 units remaining at this price.",
    headerType: "IMAGE",
    buttonText: "Book Inspection",
    buttonType: "URL",
    language: "EN_US",
    componentsCount: 4,
  },

  // ================= SERVICE (5) =================
  {
    id: "sv-1",
    name: "service subscription renewal offer",
    technicalName: "service_subscription_renewal_offer",
    category: "marketing",
    subcategory: "service",
    body: "Hi {{1}}, renew your {{2}} subscription today and get a special discount using the coupon code below.",
    footer: "Never miss out on premium features.",
    headerType: "IMAGE",
    buttonText: "Renew with 20% Off",
    buttonType: "URL",
    language: "EN_US",
    componentsCount: 4,
  },
  {
    id: "sv-2",
    name: "service technician visit scheduled",
    technicalName: "service_technician_visit_scheduled",
    category: "utility",
    subcategory: "service",
    headline: "Technician Assigned",
    body: "Hi {{1}}, engineer {{2}} is assigned for your service request #{{3}} and will arrive on {{4}}.",
    footer: "Call helpline for rescheduling.",
    headerType: "TEXT",
    buttonText: "Track Technician Live",
    buttonType: "URL",
    language: "EN_US",
    componentsCount: 3,
  },
  {
    id: "sv-3",
    name: "service request resolved feedback",
    technicalName: "service_request_resolved_feedback",
    category: "utility",
    subcategory: "service",
    headline: "Service Completed",
    body: "Hi {{1}}, ticket #{{2}} has been resolved. Please take 10 seconds to rate your service experience.",
    footer: "Your feedback helps us improve.",
    headerType: "TEXT",
    buttonText: "Rate Experience",
    buttonType: "QUICK_REPLY",
    language: "EN_US",
    componentsCount: 3,
  },
  {
    id: "sv-4",
    name: "service annual maintenance contract promo",
    technicalName: "service_annual_maintenance_contract_promo",
    category: "marketing",
    subcategory: "service",
    body: "Hi {{1}}, safeguard your appliances with AMC plans covering unlimited breakdowns and free spares.",
    footer: "Complete peace of mind coverage.",
    headerType: "IMAGE",
    buttonText: "Choose AMC Plan",
    buttonType: "URL",
    language: "EN_US",
    componentsCount: 4,
  },
  {
    id: "sv-5",
    name: "service invoice receipt ready",
    technicalName: "service_invoice_receipt_ready",
    category: "utility",
    subcategory: "service",
    body: "Hi {{1}}, invoice #{{2}} for ₹{{3}} has been generated for your recent service on {{4}}.",
    footer: "GST Tax Invoice Attached",
    headerType: "DOCUMENT",
    buttonText: "Download Invoice PDF",
    buttonType: "URL",
    language: "EN_US",
    componentsCount: 4,
  },
];

const SUBCATEGORIES_CONFIG = [
  { id: "all", label: "All Sub-categories", count: 45, icon: Layers },
  { id: "ecommerce", label: "Ecommerce", count: 5, icon: ShoppingCart },
  { id: "education", label: "Education", count: 5, icon: GraduationCap },
  { id: "banking", label: "Banking", count: 5, icon: Landmark },
  { id: "webinar", label: "Webinar", count: 5, icon: Video },
  { id: "healthcare", label: "Healthcare", count: 5, icon: Heart },
  { id: "automobile", label: "Automobile", count: 5, icon: Car },
  { id: "real-estate", label: "Real-Estate", count: 5, icon: Home },
  { id: "service", label: "Service", count: 5, icon: Wrench },
  { id: "nonprofit", label: "Nonprofit", count: 5, icon: HeartHandshake },
];

export default function TemplateLibraryPage() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [previewTemplate, setPreviewTemplate] = useState<TemplateItem | null>(null);

  // Category counts
  const categoryCounts = useMemo(() => {
    return {
      all: ALL_TEMPLATES.length, // 45
      marketing: ALL_TEMPLATES.filter((t) => t.category === "marketing").length, // 21
      utility: ALL_TEMPLATES.filter((t) => t.category === "utility").length, // 23
      authentication: ALL_TEMPLATES.filter((t) => t.category === "authentication").length, // 1
    };
  }, []);

  // Filtered templates
  const filteredTemplates = useMemo(() => {
    return ALL_TEMPLATES.filter((item) => {
      // Category filter
      if (selectedCategory !== "all" && item.category !== selectedCategory) {
        return false;
      }
      // Subcategory filter
      if (selectedSubcategory !== "all" && item.subcategory !== selectedSubcategory) {
        return false;
      }
      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesBody = item.body.toLowerCase().includes(q);
        const matchesSub = item.subcategory.toLowerCase().includes(q);
        return matchesName || matchesBody || matchesSub;
      }
      return true;
    });
  }, [selectedCategory, selectedSubcategory, search]);

  const handleUseTemplate = (template: TemplateItem) => {
    toast.success(`Selected "${template.name}". Proceeding to campaign editor...`);
    router.push(`/campaigns/new?template=${template.technicalName}`);
  };

  // Function to render highlighted {{1}} variable placeholders
  const renderHighlightedBody = (text: string) => {
    const parts = text.split(/(\{\{\d+\}\})/g);
    return parts.map((part, index) => {
      if (/^\{\{\d+\}\}$/.test(part)) {
        return (
          <span
            key={index}
            className="inline-block rounded-md bg-blue-50 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-blue-600 border border-blue-200/60 mx-0.5"
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto pb-16 font-poppins space-y-6">
      {/* ========================================================= */}
      {/* 1. Breadcrumb Bar */}
      {/* ========================================================= */}
      <div className="flex items-center gap-2 text-xs text-gray-500 font-medium px-1">
        <Link href="/dashboard" className="hover:text-gray-800 transition-colors">
          🏠
        </Link>
        <span className="text-gray-300">&gt;</span>
        <Link href="/campaigns" className="hover:text-gray-800 transition-colors">
          Campaigns
        </Link>
        <span className="text-gray-300">&gt;</span>
        <span className="text-gray-800 font-semibold">Template Library</span>
      </div>

      {/* ========================================================= */}
      {/* 2. Top Header Card */}
      {/* ========================================================= */}
      <div className="rounded-3xl border border-gray-100 bg-white p-6 sm:p-7 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#00C268] text-white flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0 mt-0.5">
            <FileText size={22} className="fill-white/20 stroke-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">
              Template Library
            </h1>
            <p className="text-xs text-gray-500 mt-1 max-w-3xl leading-relaxed">
              Select or create your template and submit it for WhatsApp approval. All templates must adhere to{" "}
              <a
                href="https://developers.facebook.com/docs/whatsapp/message-templates/guidelines"
                target="_blank"
                rel="noreferrer"
                className="text-[#00C268] hover:underline font-semibold"
              >
                WhatsApp&apos;s guidelines
              </a>
              .
            </p>
          </div>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => toast.info("Opening tutorial video...")}
            className="flex h-10 items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-xs font-semibold text-gray-700 shadow-2xs hover:bg-gray-50 transition-colors"
          >
            <Eye size={15} className="text-gray-500" />
            <span>Watch Tutorial</span>
          </button>

          <Link
            href="/campaigns/templates"
            className="flex h-10 items-center gap-2 rounded-xl bg-[#00C268] px-4 text-xs font-bold text-white shadow-xs hover:bg-[#00ab5c] active:scale-95 transition-all shrink-0"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>New Template Message</span>
          </Link>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. Category Filter Pills & Search Bar */}
      {/* ========================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* All Categories */}
          <button
            type="button"
            onClick={() => {
              setSelectedCategory("all");
              setSelectedSubcategory("all");
            }}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-all ${
              selectedCategory === "all"
                ? "bg-[#00C268] text-white shadow-xs"
                : "border border-gray-200/80 bg-white text-gray-700 hover:bg-gray-50 shadow-2xs"
            }`}
          >
            <span>All Categories</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                selectedCategory === "all"
                  ? "bg-white text-[#00C268]"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {categoryCounts.all}
            </span>
          </button>

          {/* Marketing */}
          <button
            type="button"
            onClick={() => setSelectedCategory("marketing")}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-all ${
              selectedCategory === "marketing"
                ? "bg-[#00C268] text-white shadow-xs"
                : "border border-gray-200/80 bg-white text-gray-700 hover:bg-gray-50 shadow-2xs"
            }`}
          >
            <span>Marketing</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                selectedCategory === "marketing"
                  ? "bg-white text-[#00C268]"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {categoryCounts.marketing}
            </span>
          </button>

          {/* Utility */}
          <button
            type="button"
            onClick={() => setSelectedCategory("utility")}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-all ${
              selectedCategory === "utility"
                ? "bg-[#00C268] text-white shadow-xs"
                : "border border-gray-200/80 bg-white text-gray-700 hover:bg-gray-50 shadow-2xs"
            }`}
          >
            <span>Utility</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                selectedCategory === "utility"
                  ? "bg-white text-[#00C268]"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {categoryCounts.utility}
            </span>
          </button>

          {/* Authentication */}
          <button
            type="button"
            onClick={() => setSelectedCategory("authentication")}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-all ${
              selectedCategory === "authentication"
                ? "bg-[#00C268] text-white shadow-xs"
                : "border border-gray-200/80 bg-white text-gray-700 hover:bg-gray-50 shadow-2xs"
            }`}
          >
            <span>Authentication</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                selectedCategory === "authentication"
                  ? "bg-white text-[#00C268]"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {categoryCounts.authentication}
            </span>
          </button>
        </div>

        {/* Search Box */}
        <div className="relative min-w-[240px]">
          <Search
            size={15}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-2xl border border-gray-200/80 bg-white pl-9 pr-4 text-xs text-gray-800 placeholder:text-gray-400 shadow-2xs outline-none focus:border-[#00C268] focus:ring-2 focus:ring-[#00C268]/20 transition-all"
          />
        </div>
      </div>

      {/* ========================================================= */}
      {/* 4. Main Body: Sub-Categories Sidebar + Templates Grid */}
      {/* ========================================================= */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Left Sub-Categories Menu */}
        <div className="w-full lg:w-64 shrink-0 rounded-3xl border border-gray-100 bg-white p-3 shadow-xs space-y-1">
          {SUBCATEGORIES_CONFIG.map((sub) => {
            const Icon = sub.icon;
            const isSelected = selectedSubcategory === sub.id;

            return (
              <button
                key={sub.id}
                type="button"
                onClick={() => setSelectedSubcategory(sub.id)}
                className={`w-full flex items-center justify-between rounded-2xl px-3.5 py-2.5 text-xs font-semibold transition-all ${
                  isSelected
                    ? "bg-emerald-50/80 text-[#00C268] font-bold"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    size={16}
                    className={isSelected ? "text-[#00C268]" : "text-gray-400"}
                  />
                  <span>{sub.label}</span>
                </div>

                <span
                  className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                    isSelected
                      ? "bg-[#00C268] text-white shadow-2xs"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {sub.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right Templates Grid */}
        <div className="flex-1 w-full">
          {filteredTemplates.length === 0 ? (
            <div className="rounded-3xl border border-gray-100 bg-white p-12 text-center">
              <div className="mx-auto w-12 h-12 rounded-2xl bg-emerald-50 text-[#00C268] flex items-center justify-center mb-3">
                <Search size={22} />
              </div>
              <h3 className="text-sm font-bold text-gray-900">No templates found</h3>
              <p className="text-xs text-gray-400 mt-1">Try adjusting your filters or search keywords.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filteredTemplates.map((template) => {
                const isMarketing = template.category === "marketing";
                const isUtility = template.category === "utility";

                return (
                  <div
                    key={template.id}
                    className="rounded-3xl border border-gray-100 bg-white p-5 shadow-xs flex flex-col justify-between hover:shadow-md hover:border-emerald-100/80 transition-all group"
                  >
                    <div>
                      {/* Top Badges & Eye trigger */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* Category Badge */}
                          <span
                            className={`rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${
                              isMarketing
                                ? "bg-emerald-50 text-emerald-700"
                                : isUtility
                                ? "bg-blue-50 text-blue-700"
                                : "bg-purple-50 text-purple-700"
                            }`}
                          >
                            {template.category}
                          </span>

                          {/* Subcategory Badge */}
                          <span className="rounded-md bg-blue-50/80 text-blue-600 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide">
                            {template.subcategory}
                          </span>
                        </div>

                        {/* View Template Button (Eye) */}
                        <button
                          type="button"
                          onClick={() => setPreviewTemplate(template)}
                          aria-label="View template"
                          title="View Template Preview"
                          className="grid h-7 w-7 place-items-center rounded-lg text-gray-400 hover:text-[#00C268] hover:bg-emerald-50 transition-colors"
                        >
                          <Eye size={15} />
                        </button>
                      </div>

                      {/* Template Title */}
                      <h3 className="text-sm font-bold text-gray-900 mt-3.5 capitalize tracking-tight leading-snug">
                        {template.name}
                      </h3>

                      {/* Optional Headline */}
                      {template.headline && (
                        <p className="text-xs font-semibold text-gray-700 mt-1.5">
                          {template.headline}
                        </p>
                      )}

                      {/* Body snippet with highlighted variables */}
                      <p className="text-xs text-gray-500 mt-2 leading-relaxed line-clamp-3">
                        {renderHighlightedBody(template.body)}
                      </p>
                    </div>

                    {/* Action Button */}
                    <div className="pt-4 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleUseTemplate(template)}
                        className="rounded-xl bg-[#00C268] px-4 py-2 text-xs font-bold text-white shadow-2xs hover:bg-[#00ab5c] active:scale-95 transition-all"
                      >
                        Use Template
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* 5. "View Template" Interactive Preview Modal (Screenshot 4) */}
      {/* ========================================================= */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-3xl border border-gray-100 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto scrollbar-thin">
            {/* Modal Topbar */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">
                Template Preview
              </h2>
              <button
                type="button"
                onClick={() => setPreviewTemplate(null)}
                aria-label="Close"
                className="grid h-8 w-8 place-items-center rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-5 space-y-5">
              {/* Technical Name & Meta Badges Box */}
              <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-2xs space-y-2">
                <h3 className="font-mono text-sm font-bold text-gray-900">
                  {previewTemplate.technicalName}
                </h3>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700 uppercase">
                    {previewTemplate.category}
                  </span>
                  <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 uppercase">
                    APPROVED
                  </span>
                  <span className="text-gray-400 font-medium text-[11px]">
                    Language: {previewTemplate.language}
                  </span>
                </div>
                <p className="text-xs text-gray-500 flex items-center gap-1.5 pt-1">
                  <span>💬 {previewTemplate.componentsCount} components</span>
                </p>
              </div>

              {/* WhatsApp Phone Mockup Container */}
              <div className="rounded-3xl border border-emerald-100/80 bg-emerald-50/30 p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="grid h-6 w-6 place-items-center rounded-full bg-[#00C268] text-white">
                    <MessageCircle size={14} className="fill-current" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 leading-tight">
                      WhatsApp Preview
                    </h4>
                    <p className="text-[10px] text-gray-400">
                      How your message will appear
                    </p>
                  </div>
                </div>

                {/* WhatsApp Chat Bubble Card Mockup */}
                <div className="w-full max-w-sm mx-auto rounded-2xl border border-gray-200/70 bg-white shadow-md overflow-hidden">
                  {/* WhatsApp Topbar */}
                  <div className="bg-[#00C268] px-4 py-2.5 flex items-center justify-between text-white">
                    <div className="flex items-center gap-2">
                      <span className="grid h-6 w-6 place-items-center rounded-full bg-white text-[#00C268] font-bold text-[10px]">
                        B
                      </span>
                      <div>
                        <p className="font-bold text-xs leading-tight">Business Account</p>
                        <p className="text-[9px] text-emerald-100">Template Message</p>
                      </div>
                    </div>
                    <MoreVertical size={14} className="text-white/80" />
                  </div>

                  {/* Bubble Body */}
                  <div className="p-4 space-y-3 bg-[#f8fafc]/50 text-xs">
                    {/* Header Type */}
                    {previewTemplate.headerType && (
                      <div className="flex items-center gap-1.5 rounded-lg bg-gray-100 px-2.5 py-1.5 text-[11px] font-semibold text-gray-600">
                        <span>🖼️</span>
                        <span>{previewTemplate.headerType} Header</span>
                      </div>
                    )}

                    {/* Headline if present */}
                    {previewTemplate.headline && (
                      <p className="font-bold text-gray-900">
                        {previewTemplate.headline}
                      </p>
                    )}

                    {/* Body text */}
                    <p className="text-gray-800 leading-relaxed">
                      {renderHighlightedBody(previewTemplate.body)}
                    </p>

                    {/* Footer text */}
                    {previewTemplate.footer && (
                      <p className="italic text-gray-400 text-[11px]">
                        {previewTemplate.footer}
                      </p>
                    )}

                    {/* CTA Button Mock */}
                    {previewTemplate.buttonText && (
                      <div className="pt-2 border-t border-gray-100">
                        <div className="flex items-center justify-center gap-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 py-2 font-bold text-xs shadow-2xs cursor-pointer transition-colors">
                          <ExternalLink size={13} />
                          <span>{previewTemplate.buttonText}</span>
                        </div>
                      </div>
                    )}

                    {/* WhatsApp Template watermark */}
                    <div className="text-right text-[9px] text-gray-400 pt-1">
                      WhatsApp Template
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const tpl = previewTemplate;
                    setPreviewTemplate(null);
                    handleUseTemplate(tpl);
                  }}
                  className="flex-1 flex h-11 items-center justify-center gap-2 rounded-xl bg-[#00C268] px-4 text-xs font-bold text-white shadow-xs hover:bg-[#00ab5c] transition-all"
                >
                  <Edit3 size={15} />
                  <span>Edit and Create</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewTemplate(null)}
                  className="h-11 rounded-xl border border-gray-200 px-5 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
