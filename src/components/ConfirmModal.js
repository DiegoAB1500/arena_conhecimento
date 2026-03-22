export default function ConfirmModal({ 
    isOpen, 
    message, 
    onConfirm, 
    onCancel, 
    confirmText = "Confirmar", 
    cancelText = "Cancelar", 
    confirmColor = "bg-red-500 hover:bg-red-600" 
}) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 md:p-8 animate-in zoom-in-95 duration-200">
                <h3 className="text-xl md:text-2xl font-black text-slate-800 mb-4 text-center uppercase tracking-widest">Atenção</h3>
                <p className="text-slate-600 font-medium text-center mb-8">{message}</p>
                <div className="flex flex-col md:flex-row gap-3">
                    <button 
                        onClick={onCancel}
                        className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors uppercase tracking-wider text-sm shadow-sm"
                    >
                        {cancelText}
                    </button>
                    <button 
                        onClick={onConfirm}
                        className={`flex-1 px-4 py-3 text-white font-bold rounded-xl transition-colors shadow-lg uppercase tracking-wider text-sm ${confirmColor}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
