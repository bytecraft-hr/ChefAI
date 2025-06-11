from typing import Any
from langchain.chains import create_history_aware_retriever, create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain.prompts import ChatPromptTemplate
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma
from langchain_mistralai import MistralAIEmbeddings

def build_vector_store(recipes: List[Recipe]) -> Chroma:
    logger.info(f"Recipes from DB: {len(recipes)}")
    if not recipes:
        logger.warning("No recipes provided to build vector store.")
        raise VectorStoreInitializationError("No recipes to build vector store.")

    documents = prepare_documents(recipes)
    if not documents:
        logger.warning("No LangChain documents created.")
        raise VectorStoreInitializationError("No documents to build vector store.")

    embeddings = MistralAIEmbeddings()  # ili što već koristiš

    # 🔒 Provjera praznog skupa
    if not documents or not embeddings:
        raise VectorStoreInitializationError("Embeddings or documents are empty.")

    try:
        store = Chroma.from_documents(documents, embeddings, persist_directory="./chroma_db")
        return store
    except Exception as e:
        raise VectorStoreInitializationError(f"Failed to initialize Chroma vector store: {e}")


def create_rag_chain(llm: Any, store: Any, k: int = 4) -> Any:
    retr = store.as_retriever(search_type="similarity", search_kwargs={"k": k})
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are a cooking assistant. Use the context to answer."),
        ("human", "{input}")
    ])
    hist_ret = create_history_aware_retriever(llm, retr, prompt)
    stuff = create_stuff_documents_chain(llm, prompt)
    return create_retrieval_chain(hist_ret, stuff)
