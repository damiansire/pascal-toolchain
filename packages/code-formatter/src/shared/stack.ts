import { deepEqual } from "objects-deep-compare";

/**
 * Represents a generic Stack data structure.
 * Follows the LIFO (Last-In, First-Out) principle.
 * @template T The type of elements the stack will hold.
 */
class Stack<T> {
  // Use a private array to store the stack elements.
  // The "top" of the stack will be the end of the array.
  private items: T[] = [];

  /**
   * Adds an element to the top of the stack.
   * @param item The element to add.
   */
  push(item: T): void {
    this.items.push(item); // Array's push adds to the end (our top)
  }

  /**
   * Removes and returns the element from the top of the stack.
   * @returns The top element, or undefined if the stack is empty.
   */
  pop(): T | undefined {
    // Array's pop removes and returns the last element (our top)
    // If the array is empty, pop() automatically returns undefined.
    return this.items.pop();
  }

  /**
   * Returns the element at the top of the stack without removing it.
   * @returns The top element, or undefined if the stack is empty.
   */
  peek(): T | undefined {
    if (this.isEmpty()) {
      return undefined;
    }
    // Access the last element of the array (the top)
    return this.items[this.items.length - 1];
  }

  /**
   * Checks if the stack is empty.
   * @returns true if the stack has no elements, false otherwise.
   */
  isEmpty(): boolean {
    return this.items.length === 0;
  }

  /**
   * Returns the number of elements in the stack.
   * @returns The size of the stack.
   */
  size(): number {
    return this.items.length;
  }

  /**
   * (Optional) Clears the stack, removing all its elements.
   */
  clear(): void {
    this.items = [];
  }

  /**
   * compare is the object is equal to the object in the top of the stack
   * @param item The element to compare.
   */
  compare(item: T): boolean {
    if (this.isEmpty()) {
      return false;
    }
    // Compare the item with the top element of the stack
    return deepEqual(this.peek(), item);
  }
}

export { Stack };
