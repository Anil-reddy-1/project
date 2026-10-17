/**
 * AddressForm Component
 * Form for creating and editing delivery addresses with geolocation and shop image
 */

import React, { useState, useEffect } from "react";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
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

// Storefront ("classic & modern") field styling — merged over the ui primitives via cn/twMerge
const FIELD =
  "h-11 rounded-xl border-ivory-300 bg-white px-4 text-ink placeholder:text-stone-400 focus-visible:ring-2 focus-visible:ring-brass-100 focus-visible:ring-offset-0 focus-visible:border-ink-300 focus:ring-2 focus:ring-brass-100 focus:ring-offset-0";
const FIELD_ERROR = "border-red-400 focus-visible:border-red-400";
const LABEL = "text-[13px] font-medium text-ink-700";
const ERROR_TEXT = "text-xs font-medium text-red-600";
const HINT = "text-xs text-stone-500";

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
    <form onSubmit={handleSubmit} className="space-y-5">
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
      <div className="space-y-1.5">
        <Label htmlFor="name" className={LABEL}>
          Full name <span className="text-red-500">*</span>
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
          className={`${FIELD} ${getFieldError("name") ? FIELD_ERROR : ""}`}
        />
        {getFieldError("name") && (
          <p className={ERROR_TEXT}>{getFieldError("name")}</p>
        )}
      </div>

      {/* Phone Field */}
      <div className="space-y-1.5">
        <Label htmlFor="phone" className={LABEL}>
          Phone number <span className="text-red-500">*</span>
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
          className={`${FIELD} ${getFieldError("phone") ? FIELD_ERROR : ""}`}
        />
        {getFieldError("phone") && (
          <p className={ERROR_TEXT}>{getFieldError("phone")}</p>
        )}
      </div>

      {/* Address Line 1 */}
      <div className="space-y-1.5">
        <Label htmlFor="addressLine1" className={LABEL}>
          Address line 1 <span className="text-red-500">*</span>
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
          className={`${FIELD} ${getFieldError("addressLine1") ? FIELD_ERROR : ""}`}
        />
        {getFieldError("addressLine1") && (
          <p className={ERROR_TEXT}>
            {getFieldError("addressLine1")}
          </p>
        )}
      </div>

      {/* Address Line 2 */}
      <div className="space-y-1.5">
        <Label htmlFor="addressLine2" className={LABEL}>Address line 2 <span className="text-stone-400 font-normal">(optional)</span></Label>
        <Input
          id="addressLine2"
          name="addressLine2"
          type="text"
          placeholder="Area, Landmark"
          value={formData.addressLine2}
          onChange={(e) => handleChange("addressLine2", e.target.value)}
          onBlur={() => handleBlur("addressLine2")}
          disabled={isLoading}
          className={FIELD}
        />
      </div>

      {/* City and State Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* City Field */}
        <div className="space-y-1.5">
          <Label htmlFor="city" className={LABEL}>
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
            className={`${FIELD} ${getFieldError("city") ? FIELD_ERROR : ""}`}
          />
          {getFieldError("city") && (
            <p className={ERROR_TEXT}>{getFieldError("city")}</p>
          )}
        </div>

        {/* State Field */}
        <div className="space-y-1.5">
          <Label htmlFor="state" className={LABEL}>
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
              className={`${FIELD} ${getFieldError("state") ? FIELD_ERROR : ""}`}
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
            <p className={ERROR_TEXT}>{getFieldError("state")}</p>
          )}
        </div>
      </div>

      {/* Postal Code */}
      <div className="space-y-1.5">
        <Label htmlFor="postalCode" className={LABEL}>
          PIN code <span className="text-red-500">*</span>
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
          className={`${FIELD} ${getFieldError("postalCode") ? FIELD_ERROR : ""}`}
        />
        {getFieldError("postalCode") && (
          <p className={ERROR_TEXT}>{getFieldError("postalCode")}</p>
        )}
      </div>

      {/* Shop/Location Image Upload */}
      <div className="space-y-1.5">
        <Label htmlFor="shopImage" className={LABEL}>Shop / location image <span className="text-stone-400 font-normal">(optional)</span></Label>
        <p className={`${HINT} mb-2`}>
          Upload a photo of your shop or location front for easy identification
        </p>

        {!imagePreview ? (
          <div
            className="relative border border-dashed border-ivory-300 bg-ivory-50 rounded-xl p-6 sm:p-8 text-center cursor-pointer hover:border-brass-300 hover:bg-ivory-100/60 transition-colors"
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
              <div className="w-11 h-11 rounded-full bg-white border border-ivory-200 flex items-center justify-center">
                <Upload className="w-5 h-5 text-brass-600" strokeWidth={1.75} aria-hidden="true" />
              </div>
              <p className="text-sm font-medium text-ink">
                Click to upload shop image
              </p>
              <p className="text-xs text-stone-400">PNG, JPG, WebP up to 5MB</p>
            </div>
          </div>
        ) : (
          <div className="relative rounded-xl overflow-hidden border border-ivory-200">
            <img
              src={imagePreview}
              alt="Shop preview"
              className="w-full h-48 object-cover"
            />
            {!isLoading && !isUploadingImage && (
              <button
                type="button"
                onClick={handleImageRemove}
                className="absolute top-3 right-3 bg-white/95 hover:bg-white text-red-600 border border-ivory-200 p-2 rounded-full shadow-sm transition-colors"
                title="Remove image"
                aria-label="Remove image"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            )}
            {isUploadingImage && (
              <div className="absolute inset-0 bg-ink/60 flex items-center justify-center">
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
      <div className="space-y-1.5">
        <Label className={LABEL}>Location coordinates <span className="text-stone-400 font-normal">(optional)</span></Label>
        <p className={`${HINT} mb-2`}>
          Capture your exact location for better delivery accuracy
        </p>

        {!coordinates && !formData.latitude ? (
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={handleCaptureLocation}
              disabled={isLoading || geoLoading}
              className="shop-btn-outline w-full"
            >
              {geoLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  Capturing location...
                </>
              ) : (
                <>
                  <MapPin className="w-4 h-4" aria-hidden="true" />
                  Capture location
                </>
              )}
            </button>

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
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-3 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl">
              <div className="flex items-center gap-2 min-w-0 text-sm text-emerald-800">
                <MapPin className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span className="font-medium break-words">
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
                  className="shrink-0 p-1 rounded-full text-emerald-700 hover:text-emerald-900 hover:bg-emerald-100 transition-colors"
                  title="Clear location"
                  aria-label="Clear location"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              )}
            </div>
            {coordinates && coordinates.accuracy && (
              <p className={HINT}>
                Accuracy: ±{Math.round(coordinates.accuracy)}m
              </p>
            )}
          </div>
        )}
      </div>

      {/* Set as Default Checkbox */}
      <div className="flex items-center gap-2.5 rounded-xl border border-ivory-200 bg-ivory-50 px-4 py-3">
        <input
          type="checkbox"
          id="isDefault"
          name="isDefault"
          checked={formData.isDefault}
          onChange={(e) => handleChange("isDefault", e.target.checked)}
          disabled={isLoading}
          className="h-4 w-4 rounded border-ivory-300 accent-ink text-ink focus:ring-brass-300"
        />
        <Label htmlFor="isDefault" className="cursor-pointer text-sm font-medium text-ink">
          Set as default address
        </Label>
      </div>

      {/* Form Actions */}
      <div className="flex flex-col-reverse sm:flex-row gap-3 pt-5 border-t border-ivory-200">
        {onCancel && (
          <button
            type="button"
            onClick={handleCancel}
            disabled={isLoading}
            className="shop-btn-outline flex-1"
          >
            Cancel
          </button>
        )}

        <button type="submit" disabled={isLoading} className="shop-btn-primary flex-1">
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              Saving...
            </>
          ) : (
            submitLabel
          )}
        </button>
      </div>
    </form>
  );
}

export default AddressForm;
