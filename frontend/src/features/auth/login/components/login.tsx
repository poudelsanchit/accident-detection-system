"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import * as z from "zod"

import { Button } from "@/core/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/core/components/ui/card"
import {
    Field,
    FieldError,
    FieldGroup,
    FieldLabel,
} from "@/core/components/ui/field"
import { Input } from "@/core/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/core/components/ui/select"
import {
    InputGroup,
    InputGroupAddon,
} from "@/core/components/ui/input-group"
import Link from "next/link"

const formSchema = z.object({
    prefix: z
        .string()
        .min(1, "Please select a prefix"),
    phoneNumber: z
        .string()
        .min(10, "Phone number must be at least 10 digits")
        .max(10, "Phone number must be exactly 10 digits")
        .regex(/^\d+$/, "Phone number must contain only digits"),
    password: z
        .string()
        .min(1, "Password is required"),
})

export default function LoginForm() {
    const [isLoading, setIsLoading] = React.useState(false)
    const router = useRouter()

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            prefix: "+977",
            phoneNumber: "",
            password: "",
        },
    })

    async function onSubmit(data: z.infer<typeof formSchema>) {
        setIsLoading(true)

        try {

            const result = await signIn("credentials", {
                phone: data.phoneNumber,
                password: data.password,
                redirect: false,
            })

            if (!result?.ok) {
                throw new Error(result?.error || "Login failed")
            }

            toast.success("Login successful!", {
                description: `Welcome back! You've been signed in.`,
                position: "top-center",
            })

            // Reset form after successful login
            form.reset()

            // Redirect to dashboard or home
            router.push("/dashboard")

        } catch (error) {
            toast.error("Login failed", {
                description: error instanceof Error ? error.message : "Invalid credentials. Please try again.",
                position: "top-center",
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background with image and overlay */}
            <div className="absolute inset-0 -z-10">
                <div 
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                    style={{
                        backgroundImage: `url('https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?q=80&w=2070&auto=format&fit=crop')`,
                    }}
                />
                <div className="absolute inset-0 bg-gradient-to-br from-white/95 via-gray-50/95 to-white/95" />
                <div className="absolute inset-0">
                    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-100/40 rounded-full filter blur-[120px]"></div>
                    <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-100/30 rounded-full filter blur-[120px]"></div>
                </div>
            </div>

            <Card className="w-full max-w-md shadow-2xl border-gray-200 bg-white/80 backdrop-blur-xl">
                <CardHeader className="space-y-3 text-center">
                    {/* Logo */}
                    <div className="flex justify-center mb-2">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-red-700 rounded-lg flex items-center justify-center shadow-lg">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                            </div>
                            <span className="font-bold text-xl text-gray-900">SafeDetect</span>
                        </div>
                    </div>
                    <CardTitle className="text-3xl font-bold text-gray-900">Sign in</CardTitle>
                    <CardDescription className="text-gray-600">
                        Enter your credentials to sign in
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form id="login-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FieldGroup>
                            <Controller
                                name="phoneNumber"
                                control={form.control}
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel htmlFor="phone-number">
                                            Phone Number
                                        </FieldLabel>
                                        <InputGroup>
                                            <InputGroupAddon>
                                                <Controller
                                                    name="prefix"
                                                    control={form.control}
                                                    render={({ field: prefixField }) => (
                                                        <Select
                                                            value={prefixField.value}
                                                            onValueChange={prefixField.onChange}
                                                        >
                                                            <SelectTrigger className="w-[100px] border-0 bg-transparent focus:ring-0 focus:ring-offset-0">
                                                                <SelectValue placeholder="Prefix" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="+977">🇳🇵 +977</SelectItem>
                                                                <SelectItem value="+91">🇮🇳 +91</SelectItem>
                                                                <SelectItem value="+1">🇺🇸 +1</SelectItem>
                                                                <SelectItem value="+44">🇬🇧 +44</SelectItem>
                                                                <SelectItem value="+86">🇨🇳 +86</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    )}
                                                />
                                            </InputGroupAddon>
                                            <Input
                                                {...field}
                                                id="phone-number"
                                                type="tel"
                                                aria-invalid={fieldState.invalid}
                                                placeholder="9800000000"
                                                autoComplete="tel"
                                                className="border-l-0"
                                                disabled={isLoading}
                                            />
                                        </InputGroup>
                                        {fieldState.invalid && (
                                            <FieldError errors={[fieldState.error]} />
                                        )}
                                    </Field>
                                )}
                            />

                            <Controller
                                name="password"
                                control={form.control}
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel htmlFor="password">
                                            Password
                                        </FieldLabel>
                                        <Input
                                            {...field}
                                            id="password"
                                            type="password"
                                            aria-invalid={fieldState.invalid}
                                            placeholder="Enter your password"
                                            autoComplete="current-password"
                                            disabled={isLoading}
                                        />
                                        {fieldState.invalid && (
                                            <FieldError errors={[fieldState.error]} />
                                        )}
                                    </Field>
                                )}
                            />
                        </FieldGroup>

                        <div className="flex gap-3 pt-2">
                            <Button
                                type="submit"
                                form="login-form"
                                className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-lg hover:shadow-xl transition-all"
                                disabled={isLoading}
                            >
                                {isLoading ? "Signing in..." : "Sign In"}
                            </Button>
                        </div>
                        <div className="text-sm text-gray-600 text-center">
                            Don't have an account?
                            <Link href={'/auth/signup'} className="text-red-600 hover:text-red-700 font-semibold ml-1">Sign up</Link>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}