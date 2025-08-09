import 'reflect-metadata';

/**
 * 元数据键，用于存储通过 @Inject 装饰器指定的依赖标识符。
 * 使用 Symbol 确保键的唯一性，避免与其他库的元数据键冲突。
 */
export const INJECT_METADATA_KEY = Symbol('INJECT_METADATA_KEY');

/**
 * 元数据键，用于标记一个类是可注入的。
 */
export const INJECTABLE_METADATA_KEY = Symbol('INJECTABLE_METADATA_KEY');

/**
 * 元数据键，用于标记构造函数参数是否为可选的。
 */
export const OPTIONAL_METADATA_KEY = Symbol('OPTIONAL_METADATA_KEY');

/**
 * @Injectable 类装饰器
 * 标记一个类可以被DI容器创建和管理。
 * 这是所有可注入服务的基础。
 * @returns {ClassDecorator}
 */
export function Injectable(): ClassDecorator {
  return (target: any) => {
    Reflect.defineMetadata(INJECTABLE_METADATA_KEY, true, target);
    return target;
  };
}

/**
 * @Inject 参数装饰器
 * 用于在构造函数中明确指定注入的依赖标识符（Token）。
 * 当依赖项的类型是接口（在运行时不存在）或需要注入非类值（如配置）时，此装饰器是必需的。
 * @param {any} [token] - 依赖的标识符。如果未提供，DI容器会尝试使用 `design:paramtypes` 反射类型。
 * @returns {ParameterDecorator}
 */
export function Inject(token?: any): ParameterDecorator {
  return (target: Object, propertyKey: string | symbol | undefined, parameterIndex: number) => {
    // 对于构造函数参数，propertyKey是undefined，元数据直接附加在target（类构造函数）上。
    const existingParams: any[] = Reflect.getOwnMetadata(INJECT_METADATA_KEY, target) || [];
    existingParams[parameterIndex] = token;
    Reflect.defineMetadata(INJECT_METADATA_KEY, existingParams, target);
  };
}

/**
 * @Optional 参数装饰器
 * 标记构造函数中的某个依赖是可选的。
 * 如果标记为可选的依赖在容器中无法解析，容器将注入 `null` 或 `undefined` 而不是抛出错误。
 * @returns {ParameterDecorator}
 */
export function Optional(): ParameterDecorator {
  return (target: Object, propertyKey: string | symbol | undefined, parameterIndex: number) => {
    // 对于构造函数参数，元数据直接附加在target（类构造函数）上。
    const existingOptionals: number[] = Reflect.getOwnMetadata(OPTIONAL_METADATA_KEY, target) || [];
    existingOptionals.push(parameterIndex);
    Reflect.defineMetadata(OPTIONAL_METADATA_KEY, existingOptionals, target);
  };
} 