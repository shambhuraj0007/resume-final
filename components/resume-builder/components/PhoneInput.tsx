import { useState, useEffect } from "react";
import { FieldErrors, UseFormRegister } from "react-hook-form";
import { FormValues } from "../types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PhoneInputComponentProps {
    register: UseFormRegister<FormValues>;
    errors: FieldErrors<FormValues>;
  };
  
export const PhoneInputComponent = ({ register, errors }: PhoneInputComponentProps) => {
    const storedData = localStorage.getItem("resumeitnow_form_data");
    const defaultPhone = storedData ? JSON.parse(storedData)?.formData?.personalDetails?.phone || "" : "";
    const [defaultCountryCode, phone] = defaultPhone.split(" ");
    const [countryCode, setCountryCode] = useState(defaultCountryCode || "+91");
    const [phoneNumber, setPhoneNumber] = useState(phone);
  
    useEffect(() => {
      const fullNumber = `${countryCode} ${phoneNumber}`;
      register("personalDetails.phone").onChange({
        target: { value: fullNumber, name: "personalDetails.phone" }
      });
    }, [countryCode, phoneNumber, register]);
  
    return (
      <div className="space-y-2">
        <Label>Phone Number</Label>
        <div className="flex gap-2">
          <Select value={countryCode} onValueChange={setCountryCode}>
            <SelectTrigger className="w-[100px]">
              <SelectValue>{countryCode}</SelectValue>
            </SelectTrigger>
            <SelectContent>
    <SelectItem value="+1">+1 (US, CA)</SelectItem>
    <SelectItem value="+7">+7 (RU, KZ)</SelectItem>
    <SelectItem value="+20">+20 (EG)</SelectItem>
    <SelectItem value="+27">+27 (ZA)</SelectItem>
    <SelectItem value="+30">+30 (GR)</SelectItem>
    <SelectItem value="+31">+31 (NL)</SelectItem>
    <SelectItem value="+32">+32 (BE)</SelectItem>
    <SelectItem value="+33">+33 (FR)</SelectItem>
    <SelectItem value="+34">+34 (ES)</SelectItem>
    <SelectItem value="+36">+36 (HU)</SelectItem>
    <SelectItem value="+39">+39 (IT)</SelectItem>
    <SelectItem value="+40">+40 (RO)</SelectItem>
    <SelectItem value="+41">+41 (CH)</SelectItem>
    <SelectItem value="+43">+43 (AT)</SelectItem>
    <SelectItem value="+44">+44 (UK)</SelectItem>
    <SelectItem value="+45">+45 (DK)</SelectItem>
    <SelectItem value="+46">+46 (SE)</SelectItem>
    <SelectItem value="+47">+47 (NO)</SelectItem>
    <SelectItem value="+48">+48 (PL)</SelectItem>
    <SelectItem value="+49">+49 (DE)</SelectItem>
    <SelectItem value="+51">+51 (PE)</SelectItem>
    <SelectItem value="+52">+52 (MX)</SelectItem>
    <SelectItem value="+53">+53 (CU)</SelectItem>
    <SelectItem value="+54">+54 (AR)</SelectItem>
    <SelectItem value="+55">+55 (BR)</SelectItem>
    <SelectItem value="+56">+56 (CL)</SelectItem>
    <SelectItem value="+57">+57 (CO)</SelectItem>
    <SelectItem value="+58">+58 (VE)</SelectItem>
    <SelectItem value="+60">+60 (MY)</SelectItem>
    <SelectItem value="+61">+61 (AU)</SelectItem>
    <SelectItem value="+62">+62 (ID)</SelectItem>
    <SelectItem value="+63">+63 (PH)</SelectItem>
    <SelectItem value="+64">+64 (NZ)</SelectItem>
    <SelectItem value="+65">+65 (SG)</SelectItem>
    <SelectItem value="+66">+66 (TH)</SelectItem>
    <SelectItem value="+81">+81 (JP)</SelectItem>
    <SelectItem value="+82">+82 (KR)</SelectItem>
    <SelectItem value="+84">+84 (VN)</SelectItem>
    <SelectItem value="+86">+86 (CN)</SelectItem>
    <SelectItem value="+90">+90 (TR)</SelectItem>
    <SelectItem value="+91">+91 (IN)</SelectItem>
    <SelectItem value="+92">+92 (PK)</SelectItem>
    <SelectItem value="+93">+93 (AF)</SelectItem>
    <SelectItem value="+94">+94 (LK)</SelectItem>
    <SelectItem value="+95">+95 (MM)</SelectItem>
    <SelectItem value="+960">+960 (MV)</SelectItem>
    <SelectItem value="+961">+961 (LB)</SelectItem>
    <SelectItem value="+962">+962 (JO)</SelectItem>
    <SelectItem value="+963">+963 (SY)</SelectItem>
    <SelectItem value="+964">+964 (IQ)</SelectItem>
    <SelectItem value="+965">+965 (KW)</SelectItem>
    <SelectItem value="+966">+966 (SA)</SelectItem>
    <SelectItem value="+967">+967 (YE)</SelectItem>
    <SelectItem value="+968">+968 (OM)</SelectItem>
    <SelectItem value="+969">+969 (QA)</SelectItem>
    <SelectItem value="+970">+970 (PS)</SelectItem>
    <SelectItem value="+971">+971 (AE)</SelectItem>
    <SelectItem value="+972">+972 (IL)</SelectItem>
    <SelectItem value="+973">+973 (BH)</SelectItem>
    <SelectItem value="+974">+974 (QA)</SelectItem>
    <SelectItem value="+975">+975 (BT)</SelectItem>
    <SelectItem value="+976">+976 (MN)</SelectItem>
    <SelectItem value="+977">+977 (NP)</SelectItem>
    <SelectItem value="+978">+978 (MD)</SelectItem>
    <SelectItem value="+979">+979 (TJ)</SelectItem>
    <SelectItem value="+980">+980 (TM)</SelectItem>
    <SelectItem value="+981">+981 (UZ)</SelectItem>
    <SelectItem value="+982">+982 (AM)</SelectItem>
    <SelectItem value="+983">+983 (AZ)</SelectItem>
    <SelectItem value="+984">+984 (GE)</SelectItem>
    <SelectItem value="+985">+985 (KG)</SelectItem>
    <SelectItem value="+986">+986 (MN)</SelectItem>
    <SelectItem value="+987">+987 (KZ)</SelectItem>
    <SelectItem value="+988">+988 (XK)</SelectItem>
    <SelectItem value="+989">+989 (BA)</SelectItem>
    <SelectItem value="+990">+990 (ME)</SelectItem>
    <SelectItem value="+991">+991 (RS)</SelectItem>
    <SelectItem value="+992">+992 (MD)</SelectItem>
    <SelectItem value="+993">+993 (TJ)</SelectItem>
    <SelectItem value="+994">+994 (AZ)</SelectItem>
    <SelectItem value="+995">+995 (GE)</SelectItem>
    <SelectItem value="+996">+996 (KG)</SelectItem>
    <SelectItem value="+997">+997 (KZ)</SelectItem>
    <SelectItem value="+998">+998 (TM)</SelectItem>
    <SelectItem value="+999">+999 (ZZ)</SelectItem>
</SelectContent>
          </Select>
          <Input 
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="123-456-7890"
          />
        </div>
        {errors.personalDetails?.phone && 
          <p className="text-destructive text-sm">{errors.personalDetails.phone.message}</p>}
      </div>
    );
  };
