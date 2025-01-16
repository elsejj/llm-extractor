# Features
- "Web Data Structuring" is a browser plugin that extracts data from web pages based on a structure defined by the user, converting it into the specified JSON format.
- The JSON format can be directly used for data analysis, data visualization, and other tasks.
- Users do not need to know about technologies like CSS selectors or XPath that were previously required for web scraping; they only need to describe the structure of the data they wish to extract.
- If a backend service is configured, it can send the extraction results to that service.
- The plugin also provides a JSON to Excel conversion feature, which is especially useful for nested arrays and objects within JSON, allowing for the creation of Excel files with multiple headers.
- The actual information extraction is completed through large models, supporting various large models compatible with the OpenAI interface, such as DeepSeek, Tongyi Qianwen, etc.
- For models not compatible with the OpenAI interface, they can be invoked through the large model gateway.

# Advantages
- Easy to use; users do not need to analyze the web page structure, only to describe the desired data structure.
- The JSON data format produced is entirely defined by the user and can be adjusted at any time according to their needs.
- The data extraction structure for each web page is stored separately and automatically invoked.
- Users can preview the extracted data in JSON or tabular format.
