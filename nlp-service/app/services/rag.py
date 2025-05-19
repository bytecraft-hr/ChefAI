from typing import Any
from langchain.chains import create_history_aware_retriever, create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain.prompts import ChatPromptTemplate
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma
from langchain_mistralai import MistralAIEmbeddings

def build_vector_store(recipes: list[dict]) -> Any:
    docs = [
        {"page_content": f"{r['title']}. {r['instructions']}", "metadata": {"id": r["id"]}}
        for r in recipes
    ]
    splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=0)
    chunks = splitter.split_documents(docs)
    embeddings = MistralAIEmbeddings(model="mistral-embed")
    store = Chroma.from_documents(chunks, embeddings, persist_directory="./chroma_db")
    store.persist()
    return store

def create_rag_chain(llm: Any, store: Any, k: int = 4) -> Any:
    retr = store.as_retriever(search_type="similarity", search_kwargs={"k": k})
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are a cooking assistant. Use the context to answer."),
        ("human", "{input}")
    ])
    hist_ret = create_history_aware_retriever(llm, retr, prompt)
    stuff = create_stuff_documents_chain(llm, prompt)
    return create_retrieval_chain(hist_ret, stuff)
