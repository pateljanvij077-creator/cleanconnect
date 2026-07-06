import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  rememberMe: z.boolean().optional(),
})

export const homeownerSignupSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address').or(z.literal('')),
  phone: z.string().min(10, 'Phone number must be at least 10 digits').max(15, 'Invalid phone number'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
  state: z.string().min(1, 'State is required'),
  city: z.string().min(1, 'City is required'),
  area: z.string().min(1, 'Area is required'),
  societyName: z.string().min(1, 'Society is required'),
  houseNumber: z.string().min(1, 'House or Flat Number is required'),
  address: z.string().min(5, 'Full address is required'),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})

export const workerSignupSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address').or(z.literal('')),
  phone: z.string().min(10, 'Phone must be at least 10 digits'),
  phone2: z.string().min(10, 'Backup phone must be at least 10 digits'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
  gender: z.enum(['male', 'female', 'other'], { required_error: 'Gender is required' }),
  dob: z.string().min(1, 'Date of Birth is required'),
  bio: z.string().min(10, 'Bio must be at least 10 characters'),
  experienceYears: z.number().min(0, 'Experience must be positive'),
  languages: z.array(z.string()).min(1, 'Select at least one language'),
  workerType: z.enum(['home_cleaning', 'office_cleaning', 'both'], { required_error: 'Type is required' }),
  pricingPerHour: z.number().min(1, 'Hourly pricing is required'),
  pricingPerDay: z.number().min(1, 'Daily pricing is required'),
  pricingNote: z.string().optional(),
  travelRadius: z.number().optional().default(10),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})

export const bookingSchema = z.object({
  bookingDate: z.string().min(1, 'Date is required'),
  bookingTime: z.string().min(1, 'Time slot is required'),
  notes: z.string().optional(),
  address: z.string().min(5, 'Delivery address is required'),
  paymentMethod: z.enum(['cash', 'upi'], { required_error: 'Select payment method' }),
})
