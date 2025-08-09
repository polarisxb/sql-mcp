/**
 * 深度合并对象
 * 将source对象的属性深度合并到target对象中
 * 
 * @param target 目标对象
 * @param source 源对象
 * @returns 合并后的新对象
 */
export function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  const result = { ...target };

  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      const sourceValue = source[key];
      
      // 处理null值
      if (sourceValue === null) {
        (result as any)[key] = null;
        continue;
      }
      
      // 如果是对象并且不是数组，则递归合并
      if (
        typeof sourceValue === 'object' && 
        !Array.isArray(sourceValue) &&
        sourceValue !== null &&
        typeof result[key] === 'object' && 
        !Array.isArray(result[key]) &&
        result[key] !== null
      ) {
        (result as any)[key] = deepMerge(result[key] as Record<string, any>, sourceValue as Record<string, any>);
      } else {
        // 非对象类型或数组直接替换
        (result as any)[key] = sourceValue;
      }
    }
  }

  return result;
}

/**
 * 扁平化对象
 * 将嵌套对象转换为点分隔的扁平结构
 * 
 * @param obj 嵌套对象
 * @param prefix 前缀（用于递归）
 * @returns 扁平化的对象
 */
export function flattenObject(obj: Record<string, any>, prefix: string = ''): Record<string, any> {
  const result: Record<string, any> = {};
  
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key];
      const newKey = prefix ? `${prefix}.${key}` : key;
      
      if (
        value !== null && 
        typeof value === 'object' && 
        !Array.isArray(value) &&
        Object.keys(value).length > 0
      ) {
        // 递归处理嵌套对象
        Object.assign(result, flattenObject(value, newKey));
      } else {
        // 叶子节点直接赋值
        result[newKey] = value;
      }
    }
  }
  
  return result;
}

/**
 * 安全获取对象的嵌套属性
 * 
 * @param obj 对象
 * @param path 点分隔的路径字符串
 * @param defaultValue 如果路径不存在，返回的默认值
 * @returns 属性值或默认值
 */
export function getNestedValue<T>(obj: Record<string, any>, path: string, defaultValue: T): T {
  const parts = path.split('.');
  let current = obj;
  
  for (const part of parts) {
    if (current === undefined || current === null || typeof current !== 'object') {
      return defaultValue;
    }
    current = current[part];
  }
  
  return current === undefined ? defaultValue : current as T;
} 