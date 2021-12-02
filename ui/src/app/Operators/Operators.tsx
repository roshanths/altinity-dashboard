import * as React from 'react';
import {
  Alert,
  AlertVariant,
  ButtonVariant,
  PageSection,
  Split,
  SplitItem,
  Title
} from '@patternfly/react-core';
import { SimpleModal } from '@app/Components/SimpleModal';
import { useEffect, useState } from 'react';
import { ExpandableTable } from '@app/Components/ExpandableTable';
import { AppRoutesProps } from '@app/routes';
import { ToggleModal } from '@app/Components/ToggleModal';
import { fetchWithErrorHandling } from '@app/utils/fetchWithErrorHandling';
import { NewOperatorModal } from '@app/Operators/NewOperatorModal';

interface Container {
  name: string
  state: string
  image: string
}

interface OperatorPod {
  name: string
  status: string
  version: string
  containers: Array<Container>
}

interface Operator {
  name: string
  namespace: string
  conditions: string
  version: string
  pods: Array<OperatorPod>
}

export const Operators: React.FunctionComponent<AppRoutesProps> = (props: AppRoutesProps) => {
  const [operators, setOperators] = useState(new Array<Operator>())
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<Operator|undefined>(undefined)
  const [retrieveError, setRetrieveError] = useState<string|undefined>(undefined)
  const addAlert = props.addAlert
  const fetchData = () => {
    fetchWithErrorHandling(`/api/v1/operators`, 'GET',
      undefined,
      (response, body) => {
        setOperators(body as Operator[])
        setRetrieveError(undefined)
      },
      (response, text, error) => {
        const errorMessage = (error == "") ? text : `${error}: ${text}`
        setRetrieveError(`Error retrieving operators: ${errorMessage}`)
      })
  }
  useEffect(() => {
    fetchData()
    const timer = setInterval(() => fetchData(), 2000)
    return () => {
      clearInterval(timer)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const onDeleteClick = (item: Operator) => {
    setItemToDelete(item)
    setIsDeleteModalOpen(true)
  }
  const onDeleteActionClick = () => {
    if (itemToDelete === undefined) {
      return
    }
    fetchWithErrorHandling(`/api/v1/operators/${itemToDelete.namespace}`,
      'DELETE',
      undefined,
      undefined,
      (response, text, error) => {
        const errorMessage = (error == "") ? text : `${error}: ${text}`
        addAlert(`Error deleting operator: ${errorMessage}`, AlertVariant.danger)
      }
    )
  }
  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false)
    setItemToDelete(undefined)
  }
  const onUpgradeClick = (item: Operator) => {
    addAlert(`Upgrade of ${item.name} not implemented yet`, AlertVariant.warning)
  }
  const retrieveErrorPane = retrieveError === undefined ? null : (
    <Alert variant="danger" title={retrieveError} isInline/>
  )
  return (
    <PageSection>
      <SimpleModal
        title="Delete ClickHouse Operator?"
        positionTop={true}
        actionButtonText="Delete"
        actionButtonVariant={ButtonVariant.danger}
        isModalOpen={isDeleteModalOpen}
        onActionClick={onDeleteActionClick}
        onClose={closeDeleteModal}
      >
        The operator will be removed from the <b>{itemToDelete ? itemToDelete.namespace : "UNKNOWN"}</b> namespace.
      </SimpleModal>
      <Split>
        <SplitItem isFilled>
          <Title headingLevel="h1" size="lg">
            ClickHouse Operators
          </Title>
        </SplitItem>
        <SplitItem>
          <ToggleModal
            addAlert={addAlert}
            modal={NewOperatorModal}
          />
        </SplitItem>
      </Split>
      {retrieveErrorPane}
      <ExpandableTable
        keyPrefix="operators"
        data={operators}
        columns={['Name', 'Namespace', 'Conditions', 'Version']}
        column_fields={['name', 'namespace', 'conditions', 'version']}
        actions={(item: Operator) => {
          return {
            items: [
              {
                title: "Upgrade",
                variant: "primary",
                onClick: () => {onUpgradeClick(item)}
              },
              {
                title: "Delete",
                variant: "danger",
                onClick: () => {onDeleteClick(item)}
              },
            ]
          }
        }}
        expanded_content={(data) => (
          <ExpandableTable
            keyPrefix="operator-pods"
            table_variant="compact"
            data={data.pods}
            columns={['Pod', 'Status', 'Version']}
            column_fields={['name', 'status', 'version']}
            expanded_content={(data) => (
              <ExpandableTable table_variant="compact"
                keyPrefix="operator-containers"
                data={data.containers}
                columns={['Container', 'State', 'Image']}
                column_fields={['name', 'state', 'image']}
              />
            )}
          />
        )}
      />
    </PageSection>
  )
}
