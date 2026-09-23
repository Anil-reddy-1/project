import { Button } from "./ui/button";
import { showSuccessToast, showErrorToast, showWarningToast, showInfoToast } from "../utils/toast";

/**
 * Demo component to test toast notifications
 * Can be removed after integration is complete
 */
export const ToastDemo = () => {
  return (
    <div className="p-8 space-y-4">
      <h2 className="text-2xl font-bold mb-4">Toast Notifications Demo</h2>
      <div className="flex flex-wrap gap-4">
        <Button 
          onClick={() => showSuccessToast("Product added to cart!")}
          variant="default"
        >
          Show Success Toast
        </Button>
        
        <Button 
          onClick={() => showErrorToast("Failed to add product to cart")}
          variant="destructive"
        >
          Show Error Toast
        </Button>
        
        <Button 
          onClick={() => showWarningToast("This product is low in stock")}
          variant="outline"
        >
          Show Warning Toast
        </Button>
        
        <Button 
          onClick={() => showInfoToast("Free delivery on orders over ₹1000")}
          variant="secondary"
        >
          Show Info Toast
        </Button>
      </div>
    </div>
  );
};
