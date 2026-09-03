// @ts-ignore
import React, { useEffect } from 'react';

const steps = [
    {
        title: 'Upload folders',
        description: 'Capture microscope images from each slide, save each slide\'s images in a separate folder, then upload the folders.',
    },
    {
        title: 'Run detection',
        description: 'Start detection once to process every image and calculate an egg count for each folder.',
    },
    {
        title: 'Review and correct',
        description: 'Inspect the detected eggs, check uncertain results, and correct an image count if needed.',
    },
];

function FolderModeGuide({ onClose }) {
    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') onClose();
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/35 px-6 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="folder-guide-title"
        >
            <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute right-5 top-5 rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="Close folder mode guide"
                >
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                </button>

                <div className="px-10 pb-7 pt-9">
                    <h2 id="folder-guide-title" className="text-2xl font-bold text-slate-800">
                        How Folder Mode Works
                    </h2>

                    <div className="mt-6 divide-y divide-slate-100">
                        {steps.map((step, index) => (
                            <div key={step.title} className="flex gap-5 py-5 first:pt-0">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-600 text-lg font-semibold text-white shadow-sm">
                                    {index + 1}
                                </div>
                                <div className="pt-0.5">
                                    <h3 className="text-lg font-semibold text-slate-800">{step.title}</h3>
                                    <p className="mt-1 text-sm leading-6 text-slate-500">{step.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex justify-end border-t border-slate-100 bg-slate-50 px-10 py-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                        Got it
                    </button>
                </div>
            </div>
        </div>
    );
}

export default FolderModeGuide;
