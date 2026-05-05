"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { submitReport } from "@/lib/actions/reportActions";
import { INCIDENT_OPTIONS } from "../../lib/constants";
import { sanitizeContact } from "../../lib/utils";
import Button from "./ui/Button";
import SelectInput from "./ui/SelectInput";
import TextInput from "./ui/TextInput";
import Textarea from "./ui/Textarea";
import ToastStack from "./ToastStack";

type ToastKind = "success" | "error" | "info";

type ToastItem = {
  id: string;
  message: string;
  kind: ToastKind;
};

type Coordinates = {
  latitude: number;
  longitude: number;
};

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `toast-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function ReportFormClient() {
  const [incidentType, setIncidentType] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [contact, setContact] = useState("");
  const [consent, setConsent] = useState(true);
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [locationError, setLocationError] = useState("");
  const [isLocating, setIsLocating] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const pushToast = (message: string, kind: ToastKind = "info") => {
    const id = createId();
    setToasts((prev) => [...prev, { id, message, kind }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 2600);
  };

  const handleLocationSuccess = useCallback((position: GeolocationPosition) => {
    const nextCoordinates = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };
    setCoordinates(nextCoordinates);
    setLocation(`${nextCoordinates.latitude.toFixed(6)}, ${nextCoordinates.longitude.toFixed(6)}`);
    setLocationError("");
    setIsLocating(false);
  }, []);

  const handleLocationFailure = useCallback((message: string) => {
    setCoordinates(null);
    setLocation("");
    setLocationError(message);
    setIsLocating(false);
  }, []);

  const captureLocation = useCallback(
    (reset: boolean) => {
      if (reset) {
        setIsLocating(true);
        setLocationError("");
      }

      if (!navigator.geolocation) {
        window.setTimeout(() => {
          handleLocationFailure("Geolocation is not supported by this browser.");
        }, 0);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        handleLocationSuccess,
        () => {
          handleLocationFailure("Location permission was denied. Please allow location access to submit a report.");
        },
        {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 60000,
        },
      );
    },
    [handleLocationFailure, handleLocationSuccess],
  );

  useEffect(() => {
    if (!navigator.geolocation) {
      const timeoutId = window.setTimeout(() => {
        handleLocationFailure("Geolocation is not supported by this browser.");
      }, 0);

      return () => window.clearTimeout(timeoutId);
    }

    navigator.geolocation.getCurrentPosition(
      handleLocationSuccess,
      () => {
        handleLocationFailure("Location permission was denied. Please allow location access to submit a report.");
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 60000,
      },
    );
  }, [handleLocationFailure, handleLocationSuccess]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;
    if (!coordinates) {
      pushToast(locationError || "Location is required before submitting a report.", "error");
      return;
    }
    setIsSubmitting(true);

    const result = await submitReport({
      incidentType,
      description,
      contactNumber: contact,
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      address: location,
    });

    if ("error" in result) {
      pushToast(result.error, "error");
      setIsSubmitting(false);
      return;
    }

    setIncidentType("");
    setDescription("");
    setContact("");
    setConsent(true);
    setIsSubmitting(false);
    pushToast("Emergency report submitted successfully.", "success");
  };

  const handleGetLocation = () => {
    captureLocation(true);
  };

  return (
    <>
      <form
        className="mx-auto max-w-[620px] rounded-[10px] border border-[#dfe3e8] bg-[#efeff1] p-6 shadow-[0_2px_7px_rgba(0,0,0,0.06)]"
        onSubmit={handleSubmit}
        noValidate
      >
        <SelectInput
          id="incidentType"
          label="Incident Type *"
          value={incidentType}
          onChange={(event) => setIncidentType(event.target.value)}
          options={INCIDENT_OPTIONS}
          placeholder="Select an incident type"
        />
        <div className="mb-4">
          <label htmlFor="locationInput" className="mb-2 block text-[12px] font-medium text-[var(--text)]">
            Location *
          </label>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
            <input
              id="locationInput"
              type="text"
              placeholder="Click 'Get Location' to detect your location in Sta Rita"
              value={location}
              readOnly
              className="w-full rounded-[5px] border border-[#d7dde5] bg-white px-3 py-3 text-[12px] text-[var(--text)] focus:border-[var(--red)] focus:outline-none focus:ring-4 focus:ring-[rgba(212,170,0,0.12)]"
            />
            <Button type="button" variant="dark" onClick={handleGetLocation} disabled={isLocating}>
              <i className={isLocating ? "fa-solid fa-spinner fa-spin" : "fa-solid fa-location-dot"}></i>
              <span>{isLocating ? "Locating..." : "Get Location"}</span>
            </Button>
          </div>
          {locationError ? <p className="mt-2 text-[11px] font-medium text-[#a63232]">{locationError}</p> : null}
        </div>
        <Textarea
          id="descriptionInput"
          label="Description *"
          rows={4}
          maxLength={500}
          placeholder="Provide details about the emergency (minimum 10 characters)"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
        <div className="mb-4 text-[10px] text-[var(--muted)]">{description.length}/500 characters</div>
        <TextInput
          id="contactInput"
          label="Contact Number *"
          type="text"
          placeholder="09XXXXXXXXX"
          maxLength={11}
          value={contact}
          onChange={(event) => setContact(sanitizeContact(event.target.value))}
        />
        <label className="my-4 flex items-start gap-2.5 text-[11px] text-[var(--text)]">
          <input
            type="checkbox"
            checked={consent}
            onChange={(event) => setConsent(event.target.checked)}
            className="mt-0.5 accent-[#9f48b8]"
          />
          <span>I agree to the terms and conditions and consent to emergency responders contacting me</span>
        </label>
        <Button type="submit" variant="red" className="w-full" disabled={isSubmitting}>
          <i className="fa-solid fa-paper-plane"></i>
          <span>{isSubmitting ? "Submitting..." : "Submit Emergency Report"}</span>
        </Button>
      </form>
      <ToastStack toasts={toasts} />
    </>
  );
}
