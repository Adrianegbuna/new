import { Router } from 'express';
import { AppDataSource } from '../config/database';
import { User } from '../models/User';
import { Store } from '../models/Store';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Get user profile
router.get('/profile', authenticate, async (req: AuthRequest, res) => {
  try {
    const user = req.user as any;
    const authUserId = user?.userId || user?.id;
    if (!authUserId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const userRepo = AppDataSource.getRepository(User);
    const profile = await userRepo.findOne({ where: { id: authUserId } });

    if (!profile) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      id: profile.id,
      email: profile.email,
      firstName: profile.firstName,
      lastName: profile.lastName,
      phone: profile.phone,
      country: profile.country,
      city: profile.city,
      businessName: profile.businessName,
      certifications: profile.certifications,
      yearsOfExperience: profile.yearsOfExperience,
      serviceAreas: profile.serviceAreas,
      profilePhoto: profile.profilePhoto,
      bio: profile.bio,
      specialties: profile.specialties ? profile.specialties.split(',') : [],
      interestedInPaySmallSmall: profile.interestedInPaySmallSmall
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ message: 'Failed to fetch profile' });
  }
});

// Update user profile
router.put('/profile', authenticate, async (req: AuthRequest, res) => {
  try {
    const user = req.user as any;
    const authUserId = user?.userId || user?.id;
    if (!authUserId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const userRepo = AppDataSource.getRepository(User);
    
    const profile = await userRepo.findOne({ where: { id: authUserId } });
    if (!profile) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { 
      businessName, certifications, yearsOfExperience, serviceAreas, bio, specialties, 
      phone, country, city, firstName, lastName,
      // Store settings fields
      storeName, storeDescription, businessRegistration, taxId,
      bankAccountName, bankAccountNumber, bankName, bankCode, bankCountry,
      operatingHours, storePolicy, returnPolicy, logoUrl, interestedInPaySmallSmall
    } = req.body;

    // Validate phone number if provided
    if (phone) {
      const { validatePhoneNumber } = require('../utils/phoneValidation');
      const phoneValidation = validatePhoneNumber(phone, country || profile.country || 'Nigeria');
      if (!phoneValidation.isValid) {
        return res.status(400).json({ message: phoneValidation.error || 'Invalid phone number' });
      }
    }

    // Update all provided fields
    if (businessName) profile.businessName = businessName;
    if (certifications) profile.certifications = certifications;
    if (yearsOfExperience) profile.yearsOfExperience = yearsOfExperience;
    if (serviceAreas) profile.serviceAreas = serviceAreas;
    if (bio) profile.bio = bio;
    if (phone) profile.phone = phone;
    if (country) profile.country = country;
    if (city) profile.city = city;
    if (firstName) profile.firstName = firstName;
    if (lastName) profile.lastName = lastName;
    if (specialties) profile.specialties = Array.isArray(specialties) ? specialties.join(',') : specialties;
    
    // Store settings fields
    if (storeName) profile.firstName = storeName; // Store name mapped to firstName for vendors
    if (storeDescription) profile.bio = storeDescription; // Store description mapped to bio
    if (businessRegistration) profile.businessName = businessRegistration; // For tracking registration
    if (bankAccountName) profile.bankAccountName = bankAccountName;
    if (bankAccountNumber) profile.bankAccountNumber = bankAccountNumber;
    if (bankName) profile.bankName = bankName;
    if (bankCode) profile.bankCode = bankCode;
    if (bankCountry) profile.bankCountry = bankCountry;
    if (logoUrl) profile.profilePhotoUrl = logoUrl; // Logo mapped to profilePhotoUrl
    if (interestedInPaySmallSmall !== undefined) profile.interestedInPaySmallSmall = Boolean(interestedInPaySmallSmall);

    await userRepo.save(profile);

    // Also update the Store entity if store-specific fields are being updated
    if (storeName || storeDescription || logoUrl || bankAccountName || bankAccountNumber || bankName || bankCode || bankCountry) {
      const storeRepo = AppDataSource.getRepository(Store);
      let store = await storeRepo.findOne({ where: { ownerId: profile.id } });
      
      if (store) {
        if (storeName) store.name = storeName;
        if (storeDescription) store.description = storeDescription;
        if (logoUrl) store.logo = logoUrl;
        if (bankAccountName) store.bankAccountName = bankAccountName;
        if (bankAccountNumber) store.bankAccountNumber = bankAccountNumber;
        if (bankName) store.bankName = bankName;
        if (bankCode) store.bankCode = bankCode;
        if (bankCountry) store.bankCountry = bankCountry;
        
        await storeRepo.save(store);
      }
    }

    // Return complete updated profile for immediate frontend display
    res.json({ 
      message: 'Profile updated successfully', 
      profile: {
        id: profile.id,
        email: profile.email,
        firstName: profile.firstName,
        lastName: profile.lastName,
        phone: profile.phone,
        country: profile.country,
        city: profile.city,
        businessName: profile.businessName,
        certifications: profile.certifications,
        yearsOfExperience: profile.yearsOfExperience,
        serviceAreas: profile.serviceAreas,
        profilePhoto: profile.profilePhoto,
        bio: profile.bio,
        specialties: profile.specialties ? profile.specialties.split(',') : [],
        accountType: profile.accountType,
        role: profile.role,
        interestedInPaySmallSmall: profile.interestedInPaySmallSmall,
        // Store settings fields in response
        bankAccountName: profile.bankAccountName,
        bankAccountNumber: profile.bankAccountNumber,
        bankName: profile.bankName,
        bankCode: profile.bankCode,
        bankCountry: profile.bankCountry,
        logoUrl: profile.profilePhotoUrl
      }
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ message: 'Failed to update profile' });
  }
});

// Upload profile photo (using Cloudinary for persistent storage)
// Update profile photo (accepts S3 URL from frontend)
router.post('/profile-photo', authenticate, async (req: AuthRequest, res) => {
  try {
    const user = req.user as any;
    const { photoUrl } = req.body;

    // Validate input
    if (!photoUrl || typeof photoUrl !== 'string') {
      return res.status(400).json({ message: 'photoUrl is required and must be a string' });
    }

    // Validate URL format (basic check)
    if (!photoUrl.startsWith('http://') && !photoUrl.startsWith('https://')) {
      return res.status(400).json({ message: 'photoUrl must be a valid HTTP(S) URL' });
    }

    const userRepo = AppDataSource.getRepository(User);
    const profile = await userRepo.findOne({ where: { id: user.userId } });
    
    if (!profile) {
      return res.status(404).json({ message: 'User not found' });
    }

    profile.profilePhoto = photoUrl;
    await userRepo.save(profile);

    res.json({ 
      message: 'Profile photo updated successfully',
      profilePhoto: profile.profilePhoto
    });
  } catch (error: any) {
    console.error('[PROFILE PHOTO] Error updating photo:', {
      message: error?.message,
      userId: (req.user as any)?.userId,
    });
    res.status(500).json({ message: 'Failed to update profile photo' });
  }
});

// Delete own account
router.delete('/me', authenticate, async (req: AuthRequest, res) => {
  try {
    const user = req.user as any;
    const userRepo = AppDataSource.getRepository(User);

    const profile = await userRepo.findOne({ where: { id: user.userId } });
    if (!profile) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Delete user and all related data (cascading deletes handled by database)
    await userRepo.remove(profile);

    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({ message: 'Failed to delete account' });
  }
});

// Get user profile by ID (for admin/referral viewing)
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userRepo = AppDataSource.getRepository(User);
    
    const profile = await userRepo.findOne({
      where: { id },
      select: ['id', 'firstName', 'lastName', 'email', 'phone', 'city', 'country', 'createdAt']
    });

    if (!profile) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch user' });
  }
});

export default router;
