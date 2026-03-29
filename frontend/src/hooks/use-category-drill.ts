import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CategoryNode } from '@/lib/api';

// Breadcrumb item type
export interface BreadcrumbItem {
  id: number | null;
  name: string;
}

// Helper to find a node recursively in the tree
function findNode(id: number, nodes: CategoryNode[]): CategoryNode | undefined {
  for (const node of nodes) {
    if (node.id === id) {
      return node;
    }
    if (node.children && node.children.length > 0) {
      const found = findNode(id, node.children);
      if (found) return found;
    }
  }
  return undefined;
}

export function useCategoryDrill(rootData: CategoryNode[]) {
  // drillPath[0] is always the root sentinel { id: null, name: 'All' }
  const [drillPath, setDrillPath] = useState<BreadcrumbItem[]>([
    { id: null, name: 'All' },
  ]);

  // Current nodes to display (derived from drillPath)
  const currentNodes = useMemo((): CategoryNode[] => {
    if (drillPath.length <= 1) {
      // At root level
      return rootData;
    }
    // Get the parent node from the last path item (not the root sentinel)
    const lastItem = drillPath[drillPath.length - 1];
    if (lastItem.id === null) {
      return rootData;
    }
    const parentNode = findNode(lastItem.id, rootData);
    return parentNode?.children || [];
  }, [drillPath, rootData]);

  // Current level (1-based)
  const currentLevel = useMemo((): number => {
    return drillPath.length;
  }, [drillPath]);

  // Check if at root level
  const isRoot = useMemo((): boolean => {
    return drillPath.length === 1;
  }, [drillPath]);

  // Check if we can drill into a node
  const canDrillInto = useCallback(
    (id: number): boolean => {
      const node = findNode(id, rootData);
      if (!node || !node.children || node.children.length === 0) {
        return false;
      }
      // Must have at least one child with total > 0
      return node.children.some((child) => child.total > 0);
    },
    [rootData],
  );

  // Drill into a node (push onto path)
  const drillInto = useCallback(
    (id: number): void => {
      if (!canDrillInto(id)) {
        return;
      }
      const node = findNode(id, rootData);
      if (node) {
        setDrillPath((prev) => [...prev, { id: node.id, name: node.name }]);
      }
    },
    [canDrillInto, rootData],
  );

  // Drill back to a specific breadcrumb index
  const drillBack = useCallback(
    (index: number): void => {
      if (index < 0 || index >= drillPath.length) {
        return;
      }
      if (index === 0) {
        // Drill back to root
        setDrillPath([{ id: null, name: 'All' }]);
        return;
      }
      // Slice to index + 1 and set current nodes to children of that node
      const newPath = drillPath.slice(0, index + 1);
      setDrillPath(newPath);
    },
    [drillPath],
  );

  // Reset drill state back to root
  const resetDrill = useCallback((): void => {
    setDrillPath([{ id: null, name: 'All' }]);
  }, []);

  // Reset when rootData changes (e.g., after date filter refetch)
  useEffect(() => {
    setDrillPath([{ id: null, name: 'All' }]);
  }, [rootData]);

  return {
    currentNodes,
    drillPath,
    drillInto,
    drillBack,
    canDrillInto,
    isRoot,
    currentLevel,
    resetDrill,
  };
}
