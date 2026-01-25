import type { Route } from "./+types/package-fomo";
import { Form, useActionData, useNavigation, Link } from "react-router";
import { analyzePackageFomo } from "~/utils/packageFomo";
import type { PackageFomoResult } from "~/utils/packageFomo";

export function meta({ }: Route.MetaArgs) {
    return [
        { title: "Package FOMO - Upgrade Analysis" },
        { name: "description", content: "Analyze npm packages to determine upgrade value" },
    ];
}

export async function action({ request, context }: Route.ActionArgs) {
    const formData = await request.formData();
    const packageInput = formData.get("packageInput") as string;

    if (!packageInput || !packageInput.trim()) {
        return {
            error: "Please enter a package in package.json format (e.g., \"vue\": \"^3.4.38\")",
        };
    }

    // Parse package.json format: "packageName": "version"
    const match = packageInput.match(/["']?([^"':\s]+)["']?\s*:\s*["']?([^"']+)["']?/);
    if (!match) {
        return {
            error: "Invalid format. Please use: \"packageName\": \"version\" (e.g., \"vue\": \"^3.4.38\")",
        };
    }

    const packageName = match[1];
    // Remove version prefixes like ^, ~, >=, etc. for comparison
    const currentVersion = match[2].replace(/^[\^~>=<]+/, "");

    try {
        const result = await analyzePackageFomo(
            packageName,
            currentVersion,
            context.cloudflare.env.AI
        );

        return { result, packageName, currentVersion };
    } catch (error) {
        return {
            error: error instanceof Error ? error.message : "Failed to analyze package",
        };
    }
}

export default function PackageFomo({ }: Route.ComponentProps) {
    const actionData = useActionData<typeof action>();
    const navigation = useNavigation();
    const isSubmitting = navigation.state === "submitting";

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
            <nav className="bg-white shadow-sm border-b border-gray-200 px-4 py-3">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <Link to="/" className="text-xl font-bold text-gray-900">
                        Home
                    </Link>
                    <Link
                        to="/package-fomo"
                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
                    >
                        Package FOMO
                    </Link>
                </div>
            </nav>
            <div className="py-12 px-4">
                <div className="max-w-4xl mx-auto">
                    <div className="bg-white rounded-lg shadow-xl p-8">
                        <h1 className="text-4xl font-bold text-gray-900 mb-2">
                            Package FOMO
                        </h1>
                        <p className="text-gray-600 mb-8">
                            Analyze npm packages to determine upgrade value and see what you're missing
                        </p>

                        <Form method="post" className="mb-8">
                            <div className="space-y-4">
                                <div>
                                    <label
                                        htmlFor="packageInput"
                                        className="block text-sm font-medium text-gray-700 mb-2"
                                    >
                                        Package (package.json format)
                                    </label>
                                    <input
                                        type="text"
                                        id="packageInput"
                                        name="packageInput"
                                        placeholder='"vue": "^3.4.38"'
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm text-gray-900 bg-white"
                                        defaultValue={actionData?.packageName && actionData?.currentVersion
                                            ? `"${actionData.packageName}": "${actionData.currentVersion}"`
                                            : ""
                                        }
                                    />
                                    <p className="mt-2 text-sm text-gray-500">
                                        Enter in package.json format: <code className="bg-gray-100 px-1 rounded">"packageName": "version"</code>
                                    </p>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full bg-indigo-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    {isSubmitting ? "Analyzing..." : "Analyze Package"}
                                </button>
                            </div>
                        </Form>

                        {actionData?.error && (
                            <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-red-800 font-medium">Error</p>
                                <p className="text-red-600 text-sm mt-1">{actionData.error}</p>
                            </div>
                        )}

                        {actionData?.result && (
                            <PackageFomoResults result={actionData.result} />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function PackageFomoResults({ result }: { result: PackageFomoResult }) {
    const getScoreColor = (score: number) => {
        if (score >= 70) return "text-green-600";
        if (score >= 40) return "text-yellow-600";
        return "text-red-600";
    };

    const getScoreBgColor = (score: number) => {
        if (score >= 70) return "bg-green-100";
        if (score >= 40) return "bg-yellow-100";
        return "bg-red-100";
    };

    return (
        <div className="space-y-6">
            <div className="border-t pt-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Analysis Results</h2>

                {/* Version Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-600 mb-1">Latest Version</p>
                        <p className="text-2xl font-bold text-gray-900">{result.latestVersion}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-600 mb-1">Versions Behind</p>
                        <p className="text-2xl font-bold text-gray-900">
                            {(() => {
                                const [major, minor] = result.versionsBehind.split('.').map(Number);
                                if (major === 0 && minor === 0) return "0";
                                if (major === 0) return `${minor} minor`;
                                if (minor === 0) return `${major} major`;
                                return `${major}.${minor} (${major} major, ${minor} minor)`;
                            })()}
                        </p>
                    </div>
                </div>

                {/* Scores */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className={`p-4 rounded-lg ${getScoreBgColor(result.updatenessScore)}`}>
                        <p className="text-sm text-gray-700 mb-1">Updateness Score</p>
                        <div className="flex items-center gap-3">
                            <p className={`text-3xl font-bold ${getScoreColor(result.updatenessScore)}`}>
                                {result.updatenessScore}
                            </p>
                            <span className="text-gray-500">/ 100</span>
                        </div>
                        <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                            <div
                                className={`h-2 rounded-full ${result.updatenessScore >= 70
                                    ? "bg-green-500"
                                    : result.updatenessScore >= 40
                                        ? "bg-yellow-500"
                                        : "bg-red-500"
                                    }`}
                                style={{ width: `${result.updatenessScore}%` }}
                            />
                        </div>
                    </div>

                    <div className={`p-4 rounded-lg ${getScoreBgColor(result.upgradeValueScore)}`}>
                        <p className="text-sm text-gray-700 mb-1">Upgrade Value Score</p>
                        <div className="flex items-center gap-3">
                            <p className={`text-3xl font-bold ${getScoreColor(result.upgradeValueScore)}`}>
                                {result.upgradeValueScore}
                            </p>
                            <span className="text-gray-500">/ 100</span>
                        </div>
                        <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                            <div
                                className={`h-2 rounded-full ${result.upgradeValueScore >= 70
                                    ? "bg-green-500"
                                    : result.upgradeValueScore >= 40
                                        ? "bg-yellow-500"
                                        : "bg-red-500"
                                    }`}
                                style={{ width: `${result.upgradeValueScore}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Benefits Summary */}
                <div className="bg-indigo-50 p-6 rounded-lg mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Benefits Summary
                    </h3>
                    <ul className="space-y-2">
                        {result.benefitsSummary.map((benefit, index) => (
                            <li key={index} className="flex items-start gap-3">
                                <span className="text-indigo-600 font-bold mt-1">•</span>
                                <span className="text-gray-700">{benefit}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Verdict */}
                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 rounded-lg text-white">
                    <p className="text-sm font-medium mb-2 opacity-90">Verdict</p>
                    <p className="text-xl font-bold">{result.verdict}</p>
                </div>
            </div>
        </div>
    );
}
