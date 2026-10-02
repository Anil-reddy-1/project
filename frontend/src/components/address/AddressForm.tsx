/**
 * AddressForm Component
 * Form for creating and editing delivery addresses with geolocation and shop image
 */

import React, { useState, useEffect } from "react";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Alert } from "../ui/alert";
import { AlertCircle, MapPin, Upload, X, Loader2 } from "lucide-react";
import { INDIAN_STATES, type AddressFormData } from "../../types/address.types";
import { addressService } from "../../services/address.service";
import { uploadService } from "../../services";
import { useGeolocation } from "../../hooks/useGeolocation";
import { formatCoordinatesWithLabels } from "../../utils/geolocation";
import type { AddressValidationError } from "../../types/address.types";

interface AddressFormProps {
  initialData?: Partial<AddressFormData>;
  onSubmit: (data: AddressFormData) => Promise<void> | void;
  onCancel?: () => void;
  submitLabel?: string;
  isLoading?: boolean;
  mode?: "create" | "edit";
}

const initialFormData: AddressFormData = {
  name: "",
  phone: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
  isDefault: false,
};

export function AddressForm({
  initialData,
  onSubmit,
  onCancel,
  submitLabel = "Save Address",
  isLoading = false,
}: AddressFormProps) {
  const [formData, setFormData] = useState<AddressFormData>({
    ...initialFormData,
    ...initialData,
  });

  const [errors, setErrors] = useState<AddressValidationError[]>([]);
  const [touched, setTouched] = useState<Set<string>>(new Set());

  // Image upload state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(
    initialData?.imageUrl || null,
  );
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Geolocation hook
  const {
    coordinates,
    loading: geoLoading,
    error: geoError,
    captureLocation,
    clearLocation,
    clearError: clearGeoError,
  } = useGeolocation();

  // Update form data when initialData changes (for edit mode)
  useEffect(() => {
    if (initialData) {
      setFormData(() => ({
        ...initialFormData,
        ...initialData,
      }));
      // Set image preview if exists
      if (initialData.imageUrl) {
        setImagePreview(initialData.imageUrl);
      }
    }
  }, [initialData]);

  // Update form data when coordinates change
  useEffect(() => {
    if (coordinates) {
      setFormData((prev) => ({
        ...prev,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
      }));
    }
  }, [coordinates]);

  /**
   * Handle input change
   */
  const handleChange = (
    field: keyof AddressFormData,
    value: string | boolean,
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Clear errors for this field when user starts typing
    if (errors.length > 0) {
      setErrors((prev) => prev.filter((err) => err.field !== field));
    }
  };

  /**
   * Handle input blur (mark field as touched)
   */
  const handleBlur = (field: keyof AddressFormData) => {
    setTouched((prev) => new Set(prev).add(field));
  };

  /**
   * Get error message for a specific field
   */
  const getFieldError = (field: string): string | undefined => {
    if (!touched.has(field)) return undefined;
    const error = errors.find((err) => err.field === field);
    return error?.message;
  };

  /**
   * Handle image file selection
   */
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    const validation = uploadService.validateImageFiles([file]);
    if (!validation.valid) {
      alert(validation.errors.join("\n"));
      return;
    }

    setImageFile(file);
    setImagePreview(uploadService.createPreviewUrl(file));
  };

  /**
   * Handle image removal
   */
  const handleImageRemove = () => {
    if (imagePreview && imageFile) {
      uploadService.revokePreviewUrl(imagePreview);
    }
    setImageFile(null);
    setImagePreview(null);
    setFormData((prev) => ({ ...prev, imageUrl: undefined }));
  };

  /**
   * Upload image to server
   */
  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) {
      // If there's an existing image URL (edit mode), keep it
      return formData.imageUrl || null;
    }

    setIsUploadingImage(true);
    try {
      const result = await uploadService.uploadImage(imageFile, "addresses");
      return result.data.url;
    } catch (error) {
      console.error("Image upload error:", error);
      alert("Failed to upload image. Please try again.");
      return null;
    } finally {
      setIsUploadingImage(false);
    }
  };

  /**
   * Handle geolocation capture
   */
  const handleCaptureLocation = async () => {
    clearGeoError();
    await captureLocation();
  };

  /**
   * Handle geolocation clear
   */
  const handleClearLocation = () => {
    clearLocation();
    setFormData((prev) => ({
      ...prev,
      latitude: undefined,
      longitude: undefined,
    }));
  };

  /**
   * Validate and submit form
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all fields as touched
    const allFields = Object.keys(formData);
    setTouched(new Set(allFields));

    // Upload image if new file is selected
    let imageUrl = formData.imageUrl;
    if (imageFile) {
      const uploadedImageUrl = await uploadImage();
      if (!uploadedImageUrl) {
        // Upload failed, don't proceed
        return;
      }
      imageUrl = uploadedImageUrl;
    }

    // Prepare data with image URL
    const dataToValidate = { ...formData, imageUrl };

    // Validate form data
    const validationErrors = addressService.validateAddress(dataToValidate);

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      // Scroll to first error
      const firstErrorField = document.querySelector(
        `[name="${validationErrors[0].field}"]`,
      );
      if (firstErrorField) {
        firstErrorField.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }

    // Clear errors and submit
    setErrors([]);
    await onSubmit(dataToValidate as AddressFormData);
  };

  /**
   * Handle cancel
   */
  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* General error alert */}
      {errors.length > 0 && !touched.size && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <div className="ml-2">
            <p className="font-semibold">Please fix the following errors:</p>
            <ul className="mt-2 list-disc list-inside text-sm">
              {errors.map((error, index) => (
                <li key={index}>{error.message}</li>
              ))}
            </ul>
          </div>
        </Alert>
      )}

      {/* Name Field */}
      <div className="space-y-2">
        <Label htmlFor="name">
          Full Name <span className="text-red-500">*</span>
        </Label>
        <Input
          id="name"
          name="name"
          type="text"
          placeholder="Enter recipient name"
          value={formData.name}
          onChange={(e) => handleChange("name", e.target.value)}
          onBlur={() => handleBlur("name")}
          disabled={isLoading}
          className={getFieldError("name") ? "border-red-500" : ""}
        />
        {getFieldError("name") && (
          <p className="text-sm text-red-500">{getFieldError("name")}</p>
        )}
      </div>

      {/* Phone Field */}
      <div className="space-y-2">
        <Label htmlFor="phone">
          Phone Number <span className="text-red-500">*</span>
        </Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          placeholder="10-digit mobile number"
          value={formData.phone}
          onChange={(e) => handleChange("phone", e.target.value)}
          onBlur={() => handleBlur("phone")}
          disabled={isLoading}
          maxLength={10}
          className={getFieldError("phone") ? "border-red-500" : ""}
        />
        {getFieldError("phone") && (
          <p className="text-sm text-red-500">{getFieldError("phone")}</p>
        )}
      </div>

      {/* Address Line 1 */}
      <div className="space-y-2">
        <Label htmlFor="addressLine1">
          Address Line 1 <span className="text-red-500">*</span>
        </Label>
        <Input
          id="addressLine1"
          name="addressLine1"
          type="text"
          placeholder="House no., Building name, Street"
          value={formData.addressLine1}
          onChange={(e) => handleChange("addressLine1", e.target.value)}
          onBlur={() => handleBlur("addressLine1")}
          disabled={isLoading}
          className={getFieldError("addressLine1") ? "border-red-500" : ""}
        />
        {getFieldError("addressLine1") && (
          <p className="text-sm text-red-500">
            {getFieldError("addressLine1")}
          </p>
        )}
      </div>

      {/* Address Line 2 */}
      <div className="space-y-2">
        <Label htmlFor="addressLine2">Address Line 2 (Optional)</Label>
        <Input
          id="addressLine2"
          name="addressLine2"
          type="text"
          placeholder="Area, Landmark"
          value={formData.addressLine2}
          onChange={(e) => handleChange("addressLine2", e.target.value)}
          onBlur={() => handleBlur("addressLine2")}
          disabled={isLoading}
        />
      </div>

      {/* City and State Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* City Field */}
        <div className="space-y-2">
          <Label htmlFor="city">
            City <span className="text-red-500">*</span>
          </Label>
          <Input
            id="city"
            name="city"
            type="text"
            placeholder="Enter city"
            value={formData.city}
            onChange={(e) => handleChange("city", e.target.value)}
            onBlur={() => handleBlur("city")}
            disabled={isLoading}
            className={getFieldError("city") ? "border-red-500" : ""}
          />
          {getFieldError("city") && (
            <p className="text-sm text-red-500">{getFieldError("city")}</p>
          )}
        </div>

        {/* State Field */}
        <div className="space-y-2">
          <Label htmlFor="state">
            State <span className="text-red-500">*</span>
          </Label>
          <Select
            value={formData.state}
            onValueChange={(value) => handleChange("state", value)}
            disabled={isLoading}
          >
            <SelectTrigger
              id="state"
              name="state"
              className={getFieldError("state") ? "border-red-500" : ""}
              onBlur={() => handleBlur("state")}
            >
              <SelectValue placeholder="Select state" />
            </SelectTrigger>
            <SelectContent>
              {INDIAN_STATES.map((state) => (
                <SelectItem key={state} value={state}>
                  {state}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {getFieldError("state") && (
            <p className="text-sm text-red-500">{getFieldError("state")}</p>
          )}
        </div>
      </div>

      {/* Postal Code */}
      <div className="space-y-2">
        <Label htmlFor="postalCode">
          Postal Code <span className="text-red-500">*</span>
        </Label>
        <Input
          id="postalCode"
          name="postalCode"
          type="text"
          placeholder="6-digit PIN code"
          value={formData.postalCode}
          onChange={(e) => handleChange("postalCode", e.target.value)}
          onBlur={() => handleBlur("postalCode")}
          disabled={isLoading}
          maxLength={6}
          className={getFieldError("postalCode") ? "border-red-500" : ""}
        />
        {getFieldError("postalCode") && (
          <p className="text-sm text-red-500">{getFieldError("postalCode")}</p>
        )}
      </div>

      {/* Shop/Location Image Upload */}
      <div className="space-y-2">
        <Label htmlFor="shopImage">Shop/Location Image (Optional)</Label>
        <p className="text-xs text-gray-500 mb-2">
          Upload a photo of your shop or location front for easy identification
        </p>

        {!imagePreview ? (
          <div
            className="relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 transition-colors"
            onClick={() => document.getElementById("shopImage")?.click()}
          >
            <input
              id="shopImage"
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handleImageSelect}
              disabled={isLoading || isUploadingImage}
              className="hidden"
            />
            <div className="flex flex-col items-center gap-2">
              <Upload className="w-10 h-10 text-gray-400" />
              <p className="text-sm text-gray-600">
                Click to upload shop image
              </p>
              <p className="text-xs text-gray-400">PNG, JPG, WebP up to 5MB</p>
            </div>
          </div>
        ) : (
          <div className="relative rounded-lg overflow-hidden border-2 border-gray-200">
            <img
              src={imagePreview}
              alt="Shop preview"
              className="w-full h-48 object-cover"
            />
            {!isLoading && !isUploadingImage && (
              <button
                type="button"
                onClick={handleImageRemove}
                className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full transition-colors"
                title="Remove image"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            {isUploadingImage && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="text-white text-sm flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading...
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Geolocation Section */}
      <div className="space-y-2">
        <Label>Location Coordinates (Optional)</Label>
        <p className="text-xs text-gray-500 mb-2">
          Capture your exact location for better delivery accuracy
        </p>

        {!coordinates && !formData.latitude ? (
          <div className="space-y-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCaptureLocation}
              disabled={isLoading || geoLoading}
              className="w-full"
            >
              {geoLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Capturing Location...
                </>
              ) : (
                <>
                  <MapPin className="w-4 h-4 mr-2" />
                  Capture Location
                </>
              )}
            </Button>

            {geoError && (
              <Alert variant="destructive" className="mt-2">
                <AlertCircle className="h-4 w-4" />
                <div className="ml-2">
                  <p className="text-sm">{geoError.message}</p>
                </div>
              </Alert>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-green-800">
                <MapPin className="w-4 h-4" />
                <span className="font-medium">
                  {formData.latitude && formData.longitude
                    ? formatCoordinatesWithLabels(
                        formData.latitude,
                        formData.longitude,
                      )
                    : coordinates
                      ? formatCoordinatesWithLabels(
                          coordinates.latitude,
                          coordinates.longitude,
                        )
                      : "Location captured"}
                </span>
              </div>
              {!isLoading && (
                <button
                  type="button"
                  onClick={handleClearLocation}
                  className="text-green-600 hover:text-green-800 transition-colors"
                  title="Clear location"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {coordinates && coordinates.accuracy && (
              <p className="text-xs text-gray-500">
                Accuracy: ±{Math.round(coordinates.accuracy)}m
              </p>
            )}
          </div>
        )}
      </div>

      {/* Set as Default Checkbox */}
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="isDefault"
          name="isDefault"
          checked={formData.isDefault}
          onChange={(e) => handleChange("isDefault", e.target.checked)}
          disabled={isLoading}
          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
        />
        <Label htmlFor="isDefault" className="cursor-pointer font-normal">
          Set as default address
        </Label>
      </div>

      {/* Form Actions */}
      <div className="flex gap-3 pt-4">
        <Button type="submit" disabled={isLoading} className="flex-1">
          {isLoading ? (
            <>
              <span className="mr-2">⏳</span>
              Saving...
            </>
          ) : (
            submitLabel
          )}
        </Button>

        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
            className="flex-1"
          >
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}

export default AddressForm;
